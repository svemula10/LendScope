import { type SyntheticEvent, useState } from "react";
import "./App.css";

type LoanForm = {
  person_age: number;
  person_income: number;
  person_emp_exp: number;
  person_education: string;
  person_gender: string;
  person_home_ownership: string;
  loan_amnt: number;
  loan_int_rate: number;
  loan_intent: string;
  credit_score: number;
  cb_person_cred_hist_length: number;
  previous_loan_defaults_on_file: string;
};

type PredictionResult = {
  approval_probability: number;
  statistical_pd: number;
  risk_tier: string;
  recommendation?: string;
};

const initialForm: LoanForm = {
  "person_age": 30,
  "person_gender": "Male",
  "person_education": "Bachelor",
  "person_income": 58000,
  "person_emp_exp": 5,
  "person_home_ownership": "Rent",
  "loan_amnt": 12000,
  "loan_intent": "personal",
  "loan_int_rate": 11.8,
  "cb_person_cred_hist_length": 6,
  "credit_score": 665,
  "previous_loan_defaults_on_file": "No",
};

function formatPercent(value: number) {
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function App() {
  const [formData, setFormData] = useState<LoanForm>(initialForm);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(name: keyof LoanForm, value: string) {
    const numericFields: Array<keyof LoanForm> = [
      "person_age",
      "person_income",
      "person_emp_exp",
      "loan_amnt",
      "loan_int_rate",
      "credit_score",
      "cb_person_cred_hist_length",
    ];

    setFormData((current) => ({
      ...current,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Prediction request failed.");
      }

      const data = (await response.json()) as PredictionResult;
      setResult(data);
    } catch {
      setError(
        "Could not connect to the backend. Make sure FastAPI is running on http://localhost:8000."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const approvalProbability = result?.approval_probability ?? 0;
  const defaultRisk = result?.statistical_pd ?? 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">LS</div>
          <div>
            <h1>LendScope</h1>
            <p>AI Loan Assistant</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a className="nav-item active" href="#top">
            Dashboard
          </a>
          <a className="nav-item" href="#application">
            New Application
          </a>
          <a className="nav-item" href="#results">
            Model Results
          </a>
          <a className="nav-item" href="#insights">
            Recommendations
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-dot">JD</div>
          <div>
            <strong>Demo User</strong>
            <span>Borrower</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">Applications / New Review</p>
            <h2>Loan Application Review</h2>
            <p className="subtext">
              Enter borrower details and analyze approval probability using your ML model.
            </p>
          </div>

          <button className="primary-button" form="loan-form" disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Analyze Application"}
          </button>
        </header>

        <section className="metric-grid" id="results">
          <article className="metric-card">
            <p>Approval Probability</p>
            <strong>{result ? formatPercent(approvalProbability) : "--"}</strong>
            <span>Model approval estimate</span>
          </article>

          <article className="metric-card warning">
            <p>Default Risk</p>
            <strong>{result ? formatPercent(defaultRisk) : "--"}</strong>
            <span>Statistical probability of default</span>
          </article>

          <article className="metric-card">
            <p>Risk Tier</p>
            <strong>{result?.risk_tier ?? "--"}</strong>
            <span>Based on model output</span>
          </article>

          <article className="metric-card success">
            <p>Recommendation</p>
            <strong>{result?.recommendation ?? "Pending"}</strong>
            <span>Decision support summary</span>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel" id="application">
            <div className="panel-header">
              <div>
                <h3>Borrower Information</h3>
                <p>These fields should match what your FastAPI schema expects.</p>
              </div>
            </div>

            <form id="loan-form" className="loan-form" onSubmit={handleSubmit}>
              <label>
                Age
                <input
                  type="number"
                  value={formData.person_age}
                  onChange={(event) => updateField("person_age", event.target.value)}
                />
              </label>

              <label>
                Annual Income
                <input
                  type="number"
                  value={formData.person_income}
                  onChange={(event) => updateField("person_income", event.target.value)}
                />
              </label>

              <label>
                Employment Experience
                <input
                  type="number"
                  min = "0"
                  value={formData.person_emp_exp}
                  onChange={(event) => updateField("person_emp_exp", event.target.value)}
                />
              </label>

              <label>
                Credit Score
                <input
                  type="number"
                  value={formData.credit_score}
                  onChange={(event) => updateField("credit_score", event.target.value)}
                />
              </label>

              <label>
                Loan Amount
                <input
                  type="number"
                  value={formData.loan_amnt}
                  onChange={(event) => updateField("loan_amnt", event.target.value)}
                />
              </label>

              <label>
                Interest Rate
                <input
                  type="number"
                  step="0.01"
                  value={formData.loan_int_rate}
                  onChange={(event) => updateField("loan_int_rate", event.target.value)}
                />
              </label>

              <label>
                Credit History Length
                <input
                  type="number"
                  value={formData.cb_person_cred_hist_length}
                  onChange={(event) =>
                    updateField("cb_person_cred_hist_length", event.target.value)
                  }
                />
              </label>

              <label>
                Loan Intent
                <select
                  value={formData.loan_intent}
                  onChange={(event) => updateField("loan_intent", event.target.value)}
                >
                  <option value="personal">Personal</option>
                  <option value="education">Education</option>
                  <option value="medical">Medical</option>
                  <option value="venture">Venture</option>
                  <option value="homeimprovement">Home Improvement</option>
                  <option value="debtconsolidation">Debt Consolidation</option>
                </select>
              </label>

              <label>
                Education
                <select
                  value={formData.person_education}
                  onChange={(event) => updateField("person_education", event.target.value)}
                >
                  <option value="High School">High School</option>
                  <option value="Associate">Associate</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                  <option value="Doctorate">Doctorate</option>
                </select>
              </label>

              <label>
                Gender
                <select
                  value={formData.person_gender}
                  onChange={(event) => updateField("person_gender", event.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label>
                Home Ownership
                <select
                  value={formData.person_home_ownership}
                  onChange={(event) =>
                    updateField("person_home_ownership", event.target.value)
                  }
                >
                  <option value="Rent">Rent</option>
                  <option value="Own">Own</option>
                  <option value="Mortgage">Mortgage</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Previous Defaults
                <select
                  value={formData.previous_loan_defaults_on_file}
                  onChange={(event) =>
                    updateField("previous_loan_defaults_on_file", event.target.value)
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </label>
            </form>

            {error && <p className="error-message">{error}</p>}
          </section>

          <aside className="panel summary-panel" id="insights">
            <div className="panel-header">
              <div>
                <h3>Application Snapshot</h3>
                <p>Live summary from the current form values.</p>
              </div>
            </div>

            <dl className="snapshot-list">
              <div>
                <dt>Income</dt>
                <dd>{formatMoney(formData.person_income)}</dd>
              </div>
              <div>
                <dt>Loan Amount</dt>
                <dd>{formatMoney(formData.loan_amnt)}</dd>
              </div>
              <div>
                <dt>Credit Score</dt>
                <dd>{formData.credit_score}</dd>
              </div>
              <div>
                <dt>Employment</dt>
                <dd>{formData.person_emp_exp} years</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{formData.loan_intent}</dd>
              </div>
            </dl>

            <div className="recommendation-box">
              <h4>Recommendation Summary</h4>
              <p>
                {result
                  ? `This application is currently classified as ${result.risk_tier}. Review the approval probability and default risk before making a final decision.`
                  : "Submit an application to generate a model-backed recommendation summary."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
