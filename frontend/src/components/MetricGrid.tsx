import type { Mode } from "../App";

interface MetricGridProps {
  approvalProbability: number;
  approvalChange: number;
  defaultRisk: number;
  riskTier: string;
  recommendation: string;
  formatPercent: (value: number) => string;
  currentMode: Mode;
  annualIncome: number;   
  simulatedPayment: number; 
}

export default function MetricGrid({
  approvalProbability,
  approvalChange,
  defaultRisk,
  riskTier,
  //recommendation,
  formatPercent,
  currentMode,
  annualIncome,
  simulatedPayment,
}: MetricGridProps) {
  const isBorrower = currentMode === "borrower";

  //FEATURE D: Front-End Debt-to-Income Calculation Logic
  const annualLoanCost = simulatedPayment * 12;
  const dtiPercentage = annualIncome > 0 ? (annualLoanCost / annualIncome) * 100 : 0;

  // Determine safety bar styling flags based on standard institutional bounds
  let progressColor = "#2f9d55"; // Safe (Under 35%)
  let dtiStatusLabel = "Compliant Range";
  if (dtiPercentage > 45) {
    progressColor = "#bd2525"; // Critical Out-of-Bounds (Above 45%)
    dtiStatusLabel = "High Default Risk Variance";
  } else if (dtiPercentage > 35) {
    progressColor = "#f0a23a"; // Warning (35% - 45%)
    dtiStatusLabel = "Policy Warning Level";
  }

  return (
    <section className="metric-grid">
      <article className="metric-card">
        <p>{isBorrower ? "Estimated Approval Chance" : "Approval Probability"}</p>
        <strong>{formatPercent(approvalProbability)}</strong>
        <span>
          {approvalChange === 0
            ? isBorrower ? "Your profile trajectory baseline" : "Current model estimate"
            : `${approvalChange > 0 ? "+" : ""}${formatPercent(approvalChange)} from baseline`}
        </span>
      </article>

      <article className={`metric-card ${isBorrower ? "" : "warning"}`}>
        <p>{isBorrower ? "Approval Horizon" : "Default Risk"}</p>
        <strong>
          {isBorrower 
            ? (approvalProbability > 0.75 ? "Strong Match" : approvalProbability > 0.45 ? "Moderate Match" : "High Friction Range") 
            : formatPercent(defaultRisk)}
        </strong>
        <span>{isBorrower ? "Aggregate health tier guidance" : "Statistical probability of default"}</span>
      </article>

      <article className="metric-card">
        <p>{isBorrower ? "Readiness Category" : "Risk Tier"}</p>
        <strong>{riskTier}</strong>
        <span>Based on current configuration</span>
      </article>


      {/* DYNAMIC SLOT CHECK: Borrower receives action focus; Lender receives DTI Monitor */}
      {isBorrower ? (
        <article className={`metric-card ${approvalProbability > 0.5 ? "success" : "warning"}`}>
          <p>Strategic Focus</p>
          <strong>
            {approvalProbability > 0.75 ? "Optimize Terms" : "Review Simulator Sliders"}
          </strong>
          <span>Decision support status</span>
        </article>
      ) : (
        /* FEATURE D DISPLAY PANEL (Underwriter Only) */
        <article className="metric-card">
          <p>DTI Guardrail Monitor</p>
          <strong style={{ color: progressColor }}>{dtiPercentage.toFixed(1)}%</strong>
          
          {/* Visual Progress Meter */}
          <div style={{ width: "100%", height: "6px", background: "#e2e8f3", borderRadius: "999px", marginTop: "12px", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(dtiPercentage, 100)}%`, height: "100%", background: progressColor, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ marginTop: "8px" }}>{dtiStatusLabel}</span>
        </article>
      )}
    </section>
  );
}