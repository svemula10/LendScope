import "./HomeLanding.css";

interface HomeLandingProps {
  onSelectMode: (mode: "borrower" | "underwriter") => void;
}

export function HomeLanding({ onSelectMode }: HomeLandingProps) {
  return (
    <div className="landing-container">
      <div className="landing-hero">
        <span className="landing-badge">AI-Powered Fintech Copilot</span>
        <h1>Welcome to LendScope</h1>
        <p className="landing-subtext">
          Bridging the gap between everyday loan applicants and enterprise-grade 
          mortgage underwriters with transparent, explainable AI, document-grounded 
          verification, and policy-backed compliance audits.
        </p>

        <div className="landing-cta-grid">
          <div className="cta-card borrower-card">
            <div className="card-icon">👤</div>
            <h3>Borrower Mode (B2C)</h3>
            <p>
              Understand your loan readiness score, run real-time "What-If" simulations, 
              calculate monthly amortizations, and get plain-English guidance to improve your odds.
            </p>
            <button 
              className="primary-button"
              onClick={() => onSelectMode("borrower")}
            >
              Enter Borrower Portal →
            </button>
          </div>

          <div className="cta-card underwriter-card">
            <div className="card-icon">🏢</div>
            <h3>Underwriter Mode (B2B)</h3>
            <p>
              Streamline institutional risk operations with ML risk models, dynamic 
              Debt-to-Income (DTI) guardrails, and one-click PDF audit briefs.
            </p>
            <button 
              className="primary-button"
              onClick={() => onSelectMode("underwriter")}
            >
              Enter Underwriter Portal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}