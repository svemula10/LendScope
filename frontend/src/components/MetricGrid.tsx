//import type { PredictionResult } from "../App";

interface MetricGridProps {
  approvalProbability: number;
  approvalChange: number;
  defaultRisk: number;
  riskTier: string;
  recommendation: string;
  formatPercent: (value: number) => string;
}

export default function MetricGrid({
  approvalProbability,
  approvalChange,
  defaultRisk,
  riskTier,
  recommendation,
  formatPercent,
}: MetricGridProps) {
  return (
    <section className="metric-grid">
      <article className="metric-card">
        <p>Approval Probability</p>
        <strong>{formatPercent(approvalProbability)}</strong>
        <span>
          {approvalChange === 0
            ? "Current model estimate"
            : `${approvalChange > 0 ? "+" : ""}${formatPercent(approvalChange)} from original`}
        </span>
      </article>

      <article className="metric-card warning">
        <p>Default Risk</p>
        <strong>{formatPercent(defaultRisk)}</strong>
        <span>Statistical probability of default</span>
      </article>

      <article className="metric-card">
        <p>Risk Tier</p>
        <strong>{riskTier}</strong>
        <span>Based on the current scenario</span>
      </article>

      <article className="metric-card success">
        <p>Recommendation</p>
        <strong>{recommendation}</strong>
        <span>Decision support summary</span>
      </article>
    </section>
  );
}