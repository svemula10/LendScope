//WhatifSimulator.tsx
import type { LoanForm as LoanFormType, Mode } from "../App";

interface WhatIfSimulatorProps {
  simulatorData: LoanFormType;
  updateSimulatorField: (name: keyof LoanFormType, value: string) => void;
  isSimulating: boolean;
  formatMoney: (value: number) => string;
  currentMode: Mode;
  approvalProbability: number;
}

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

  const alerts: DiagnosticAlert[] = [];
  
  if (isBorrower) {
    const isProfileOtherwiseStrong = approvalProbability >= 0.70;

    if (simulatorData.credit_score < 670) {
      alerts.push({
        message: isProfileOtherwiseStrong 
          ? "Your credit score is low, but your strong income is helping offset the impact. Try raising your score above 700 to maximize your odds."
          : "Your credit score is low. This is significantly dragging down your approval chances.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }

    if (simulatorData.person_emp_exp < 2) {
      alerts.push({
        message: isProfileOtherwiseStrong
          ? "Your short job history is a minor flag, but your overall approval profile remains stable."
          : "Lenders prefer at least 2 years of steady job history. Your short work background is limiting your readiness.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }

    if (simulatorData.previous_loan_defaults_on_file === "Yes") {
      alerts.push({
        message: isProfileOtherwiseStrong
          ? "A past loan default is on your record. Your current numbers are offsetting it, but it remains a high-risk factor."
          : "A past loan default is severely hurting your application. You will need to drop your loan amount or raise your score to clear this hurdle.",
        severity: isProfileOtherwiseStrong ? "warning" : "danger",
      });
    }

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

      {isBorrower && alerts.length > 0 && (
        <div style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
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
                  background: isDanger ? "#fff1f1" : "#fffbeb",
                  color: isDanger ? "#bd2525" : "#8a6d1c",
                  border: `1px solid ${isDanger ? "#ffd4d4" : "#fde68a"}`
                }}
              >
                <span>{isDanger ? "🛑 Critical: " : "⚠️ Attention: "}</span>
                {alert.message}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}