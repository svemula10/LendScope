import type { LoanForm as LoanFormType, Mode } from "../App";

interface WhatIfSimulatorProps {
  simulatorData: LoanFormType;
  updateSimulatorField: (name: keyof LoanFormType, value: string) => void;
  isSimulating: boolean;
  formatMoney: (value: number) => string;
  currentMode: Mode;
  approvalProbability: number; // <-- ADDED: Allows alerts to factor in overall approval odds
}

// Define structure for our tiered alert system
interface DiagnosticAlert {
  message: string;
  severity: "warning" | "danger";
}

export default function WhatIfSimulator({
  simulatorData,
  updateSimulatorField,
  isSimulating,
  formatMoney,
  currentMode,
  approvalProbability,
}: WhatIfSimulatorProps) {
  const isBorrower = currentMode === "borrower";

  // Feature A: Amortization Calculations
  const loanAmount = simulatorData.loan_amnt || 0;
  const annualRate = simulatorData.loan_int_rate || 0;
  const defaultTermMonths = 36;

  const monthlyRate = annualRate / 100 / 12;
  let monthlyRepayment = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyRepayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, defaultTermMonths)) /
      (Math.pow(1 + monthlyRate, defaultTermMonths) - 1);
  } else if (loanAmount > 0) {
    monthlyRepayment = loanAmount / defaultTermMonths;
  }

  const totalPayoff = monthlyRepayment * defaultTermMonths;
  const totalInterest = totalPayoff - loanAmount;

  // ========================================================
  // REWRITTEN FEATURE B: Tiered & Probability-Aware Diagnostics
  // ========================================================
  const alerts: DiagnosticAlert[] = [];
  
  if (isBorrower) {
    // Helper flag to check if other metrics are saving the application
    const isProfileOtherwiseStrong = approvalProbability >= 0.70;

    // 1. Credit Score Check
    if (simulatorData.credit_score < 670) {
      alerts.push({
        message: isProfileOtherwiseStrong 
          ? "Your credit score is low, but your strong income is helping offset the impact. Try raising your score above 700 to maximize your odds."
          : "Your credit score is low. This is significantly dragging down your approval chances.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }
    
    // 2. Debt-to-Income (DTI) Ratio Check
    const annualLoanCost = monthlyRepayment * 12;
    const liveDti = simulatorData.person_income > 0 ? (annualLoanCost / simulatorData.person_income) * 100 : 0;
    if (liveDti > 38) {
      alerts.push({
        message: `Your loan payments eat up a large portion of your monthly earnings (${liveDti.toFixed(0)}% DTI). Consider requesting a lower loan amount.`,
        severity: liveDti > 45 ? "danger" : "warning", // Scaled strictly on high debt margins
      });
    }

    // 3. Employment Experience Check
    if (simulatorData.person_emp_exp < 2) {
      alerts.push({
        message: isProfileOtherwiseStrong
          ? "Your short job history is a minor flag, but your overall approval profile remains stable."
          : "Lenders prefer at least 2 years of steady job history. Your short work background is limiting your readiness.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }

    // 4. Historical Defaults Check
    if (simulatorData.previous_loan_defaults_on_file === "Yes") {
      alerts.push({
        message: isProfileOtherwiseStrong
          ? "A past loan default is on your record. Your current numbers are offsetting it, but it remains a high-risk factor."
          : "A past loan default is severely hurting your application. You will need to drop your loan amount or raise your score to clear this hurdle.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }

    // 5. High Interest Rate Trap Check
    if (simulatorData.loan_int_rate > 15) {
      alerts.push({
        message: `Your interest rate (${simulatorData.loan_int_rate}%) is very high. This makes the loan expensive and lowers your final approval odds.`,
        severity: "danger",
      });
    }
  }

  return (
    <section className="panel simulator-panel">
      <div className="panel-header">
        <div>
          <h3>What-If Simulator</h3>
          <p>
            Adjust your numbers to see how your estimated approval odds change in real time.
            {isSimulating ? " Updating calculations..." : ""}
          </p>
        </div>
      </div>

      <div className="simulator-grid">
        <label className="slider-field">
          <span>
            Annual Income <strong>{formatMoney(simulatorData.person_income)}</strong>
          </span>
          <input
            type="range"
            min="20000"
            max="250000"
            step="1000"
            value={simulatorData.person_income}
            onChange={(event) => updateSimulatorField("person_income", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Loan Amount <strong>{formatMoney(simulatorData.loan_amnt)}</strong>
          </span>
          <input
            type="range"
            min="1000"
            max="50000"
            step="500"
            value={simulatorData.loan_amnt}
            onChange={(event) => updateSimulatorField("loan_amnt", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Interest Rate <strong>{simulatorData.loan_int_rate.toFixed(2)}%</strong>
          </span>
          <input
            type="range"
            min="3"
            max="30"
            step="0.25"
            value={simulatorData.loan_int_rate}
            onChange={(event) => updateSimulatorField("loan_int_rate", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Credit Score <strong>{simulatorData.credit_score}</strong>
          </span>
          <input
            type="range"
            min="300"
            max="850"
            step="5"
            value={simulatorData.credit_score}
            onChange={(event) => updateSimulatorField("credit_score", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Employment History <strong>{simulatorData.person_emp_exp} years</strong>
          </span>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={simulatorData.person_emp_exp}
            onChange={(event) => updateSimulatorField("person_emp_exp", event.target.value)}
          />
        </label>
      </div>

      {isBorrower && (
        <div style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
          {/* Feature A UI Box */}
          <div style={{ padding: "16px", background: "#f0f4ff", borderRadius: "8px", borderLeft: "4px solid #4b6fff" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#081733" }}>Estimated 36-Month Repayment</h4>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px" }}>
              <div>Monthly Payment: <strong>{formatMoney(monthlyRepayment)}/mo</strong></div>
              <div>Total Interest: <span style={{ color: "#bd2525" }}>{formatMoney(totalInterest)}</span></div>
              <div>Total Cost: <strong>{formatMoney(totalPayoff)}</strong></div>
            </div>
          </div>

  
          {/* Dynamic Split-Color Tiered Rendering*/}
          {alerts.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <h4 style={{ margin: "4px 0 0 0", color: "#172033", fontWeight: 700 }}>Application Insights</h4>
              
              {alerts.map((alert, index) => {
                const isDanger = alert.severity === "danger";
                return (
                  <div 
                    key={index} 
                    style={{ 
                      padding: "12px 14px", 
                      borderRadius: "8px", 
                      fontSize: "13px",
                      lineHeight: "1.4",
                      fontWeight: 600,
                      background: isDanger ? "#fff1f1" : "#fffbeb", // Red vs Soft Yellow Background
                      color: isDanger ? "#bd2525" : "#8a6d1c",      // Dark Red vs Balanced Amber text
                      border: `1px solid ${isDanger ? "#ffd4d4" : "#fde68a"}` // Matching outer borders
                    }}
                  >
                    <span>{isDanger ? "🛑 Critical: " : "⚠️ Attention: "}</span>
                    {alert.message}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}