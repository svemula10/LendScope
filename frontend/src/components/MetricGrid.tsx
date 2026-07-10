import type { Mode } from "../App";

interface MetricGridProps {
  approvalProbability: number;
  approvalChange: number;
  defaultRisk: number;
  riskTier: string;
  recommendation: string;
  formatPercent: (value: number) => string;
  currentMode: Mode;
}

export default function MetricGrid({
  approvalProbability,
  approvalChange,
  defaultRisk,
  riskTier,
  recommendation,
  formatPercent,
  currentMode,
}: MetricGridProps) {
  const isBorrower = currentMode === "borrower";

  return (
    <section className="metric-grid">
      <article className="metric-card">
        <p>{isBorrower ? "Estimated Approval Chance" : "Approval Probability"}</p>
        <strong>{formatPercent(approvalProbability)}</strong>
        <span>
          {approvalChange === 0
            ? isBorrower ? "Current scenario baseline" : "Current model estimate"
            : `${approvalChange > 0 ? "+" : ""}${formatPercent(approvalChange)} from baseline`}
        </span>
      </article>

      <article className={`metric-card ${isBorrower ? "" : "warning"}`}>
        <p>{isBorrower ? "Approval Horizon" : "Default Risk"}</p>
        <strong>{isBorrower ? (approvalProbability > 0.7 ? "Strong" : "Moderate") : formatPercent(defaultRisk)}</strong>
        <span>{isBorrower ? "Aggregated health assessment" : "Statistical probability of default"}</span>
      </article>

      <article className="metric-card">
        <p>{isBorrower ? "Readiness Tier" : "Risk Tier"}</p>
        <strong>{riskTier}</strong>
        <span>Based on current configuration</span>
      </article>

      <article className={`metric-card ${approvalProbability > 0.5 ? "success" : "warning"}`}>
        <p>{isBorrower ? "Strategic Placement" : "Recommendation"}</p>
        <strong>{isBorrower ? (approvalProbability > 0.65 ? "Target Range" : "Review Fields") : recommendation}</strong>
        <span>Decision support status</span>
      </article>
    </section>
  );
}