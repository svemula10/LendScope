import { type SyntheticEvent, useEffect, useState } from "react";
import "./App.css";

type View = "application" | "dashboardList" | "dashboardDetail";

type LoanForm = {
  applicant_name: string;
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

type PredictionPayload = Omit<LoanForm, "applicant_name">;

type PredictionResult = {
  approval_probability: number;
  statistical_pd: number;
  risk_tier: string;
  recommendation?: string;
};

type SavedApplication = {
  id: number;
  form: LoanForm;
  result: PredictionResult;
};

const numericFields: Array<keyof LoanForm> = [
  "person_age",
  "person_income",
  "person_emp_exp",
  "loan_amnt",
  "loan_int_rate",
  "credit_score",
  "cb_person_cred_hist_length",
];

const emptyForm: LoanForm = {
  applicant_name: "",
  person_age: 0,
  person_income: 0,
  person_emp_exp: 0,
  person_education: "",
  person_gender: "",
  person_home_ownership: "",
  loan_amnt: 0,
  loan_int_rate: 0,
  loan_intent: "",
  credit_score: 0,
  cb_person_cred_hist_length: 0,
  previous_loan_defaults_on_file: "",
};

function buildPayload(form: LoanForm): PredictionPayload {
  return {
    person_age: form.person_age,
    person_income: form.person_income,
    person_emp_exp: form.person_emp_exp,
    person_education: form.person_education,
    person_gender: form.person_gender,
    person_home_ownership: form.person_home_ownership,
    loan_amnt: form.loan_amnt,
    loan_int_rate: form.loan_int_rate,
    loan_intent: form.loan_intent,
    credit_score: form.credit_score,
    cb_person_cred_hist_length: form.cb_person_cred_hist_length,
    previous_loan_defaults_on_file: form.previous_loan_defaults_on_file,
  };
}

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

function formatIntent(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ");
}

function App() {
  const [activeView, setActiveView] = useState<View>("dashboardList");
  const [formData, setFormData] = useState<LoanForm>(emptyForm);
  const [savedApplications, setSavedApplications] = useState<SavedApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [simulatorData, setSimulatorData] = useState<LoanForm>(emptyForm);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [simulatorResult, setSimulatorResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState("");

  const selectedApplication =
    savedApplications.find((application) => application.id === selectedApplicationId) ?? null;

  const displayedApplication = selectedApplication?.form ?? emptyForm;
  const displayedResult = simulatorResult ?? selectedApplication?.result ?? result;
  const baselineResult = selectedApplication?.result ?? result;
  const baselineApproval = baselineResult?.approval_probability ?? 0;
  const approvalProbability = displayedResult?.approval_probability ?? 0;
  const defaultRisk = displayedResult?.statistical_pd ?? 0;
  const approvalChange = displayedResult
    ? displayedResult.approval_probability - baselineApproval
    : 0;

  function startNewApplication() {
    setFormData(emptyForm);
    setError("");
    setResult(null);
    setSimulatorResult(null);
    setSelectedApplicationId(null);
    setActiveView("application");
  }

  function updateField(name: keyof LoanForm, value: string) {
    setFormData((current) => ({
      ...current,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  function updateSimulatorField(name: keyof LoanForm, value: string) {
    setSimulatorData((current) => ({
      ...current,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  async function predict(application: LoanForm) {
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(application)),
    });

    if (!response.ok) {
      throw new Error("Prediction request failed.");
    }

    return (await response.json()) as PredictionResult;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await predict(formData);

      const newApplication: SavedApplication = {
        id: Date.now(),
        form: formData,
        result: data,
      };

      setSavedApplications((current) => [newApplication, ...current]);
      setSelectedApplicationId(newApplication.id);
      setResult(data);
      setSimulatorResult(data);
      setSimulatorData(formData);
      setActiveView("dashboardDetail");
    } catch {
      setError(
        "Could not connect to the backend. Make sure FastAPI is running on http://localhost:8000."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function openDashboard(application: SavedApplication) {
    setSelectedApplicationId(application.id);
    setResult(application.result);
    setSimulatorResult(application.result);
    setSimulatorData(application.form);
    setError("");
    setActiveView("dashboardDetail");
  }

  useEffect(() => {
    if (!selectedApplication || activeView !== "dashboardDetail") {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSimulating(true);

      try {
        const data = await predict(simulatorData);
        setSimulatorResult(data);
        setError("");
      } catch {
        setError("The simulator could not reach the prediction API.");
      } finally {
        setIsSimulating(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [simulatorData, selectedApplication, activeView]);

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

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            className={`nav-item ${
              activeView === "dashboardList" || activeView === "dashboardDetail" ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveView("dashboardList")}
          >
            Dashboard
          </button>

          <button
            className={`nav-item ${activeView === "application" ? "active" : ""}`}
            type="button"
            onClick={startNewApplication}
          >
            New Application
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-dot">LS</div>
          <div>
            <strong>Demo Workspace</strong>
            <span>Underwriter View</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeView === "dashboardList" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Dashboards</p>
                <h2>Application Dashboards</h2>
                <p className="subtext">View previously analyzed loan applications.</p>
              </div>

              <button className="primary-button" type="button" onClick={startNewApplication}>
                New Application
              </button>
            </header>

            {savedApplications.length === 0 ? (
              <section className="panel empty-state">
                <h3>No dashboards yet</h3>
                <p>Analyze a new application and it will appear here.</p>
              </section>
            ) : (
              <section className="dashboard-list">
                {savedApplications.map((application) => (
                  <article className="panel dashboard-list-card" key={application.id}>
                    <div>
                      <h3>{application.form.applicant_name || "Unnamed Applicant"}</h3>
                      <p>
                        {formatMoney(application.form.loan_amnt)} loan · Credit score{" "}
                        {application.form.credit_score}
                      </p>
                    </div>

                    <div className="dashboard-list-metrics">
                      <span>{formatPercent(application.result.approval_probability)} approval</span>
                      <span>{application.result.risk_tier}</span>
                    </div>

                    <button
                      className="primary-button secondary-button"
                      type="button"
                      onClick={() => openDashboard(application)}
                    >
                      View Dashboard
                    </button>
                  </article>
                ))}
              </section>
            )}
          </>
        )}

        {activeView === "application" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Applications / New Review</p>
                <h2>New Loan Application</h2>
                <p className="subtext">
                  Enter borrower details, run the model, then review the full dashboard.
                </p>
              </div>

              <button className="primary-button" form="loan-form" disabled={isLoading}>
                {isLoading ? "Analyzing..." : "Analyze Application"}
              </button>
            </header>

            <section className="panel application-panel">
              <div className="panel-header">
                <div>
                  <h3>Borrower Information</h3>
                  <p>These fields match the values your FastAPI model expects.</p>
                </div>
              </div>

              <form id="loan-form" className="loan-form" onSubmit={handleSubmit}>
                <label>
                  Applicant Name
                  <input
                    required
                    type="text"
                    value={formData.applicant_name}
                    onChange={(event) => updateField("applicant_name", event.target.value)}
                  />
                </label>

                <label>
                  Age
                  <input
                    required
                    type="number"
                    min="18"
                    value={formData.person_age || ""}
                    onChange={(event) => updateField("person_age", event.target.value)}
                  />
                </label>

                <label>
                  Annual Income
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.person_income || ""}
                    onChange={(event) => updateField("person_income", event.target.value)}
                  />
                </label>

                <label>
                  Employment Experience
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.person_emp_exp || ""}
                    onChange={(event) => updateField("person_emp_exp", event.target.value)}
                  />
                </label>

                <label>
                  Credit Score
                  <input
                    required
                    type="number"
                    min="300"
                    max="850"
                    value={formData.credit_score || ""}
                    onChange={(event) => updateField("credit_score", event.target.value)}
                  />
                </label>

                <label>
                  Loan Amount
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.loan_amnt || ""}
                    onChange={(event) => updateField("loan_amnt", event.target.value)}
                  />
                </label>

                <label>
                  Interest Rate
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.loan_int_rate || ""}
                    onChange={(event) => updateField("loan_int_rate", event.target.value)}
                  />
                </label>

                <label>
                  Credit History Length
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.cb_person_cred_hist_length || ""}
                    onChange={(event) =>
                      updateField("cb_person_cred_hist_length", event.target.value)
                    }
                  />
                </label>

                <label>
                  Loan Intent
                  <select
                    required
                    value={formData.loan_intent}
                    onChange={(event) => updateField("loan_intent", event.target.value)}
                  >
                    <option value="">Select loan intent</option>
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
                    required
                    value={formData.person_education}
                    onChange={(event) => updateField("person_education", event.target.value)}
                  >
                    <option value="">Select education</option>
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
                    required
                    value={formData.person_gender}
                    onChange={(event) => updateField("person_gender", event.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>

                <label>
                  Home Ownership
                  <select
                    required
                    value={formData.person_home_ownership}
                    onChange={(event) =>
                      updateField("person_home_ownership", event.target.value)
                    }
                  >
                    <option value="">Select home ownership</option>
                    <option value="Rent">Rent</option>
                    <option value="Own">Own</option>
                    <option value="Mortgage">Mortgage</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Previous Defaults
                  <select
                    required
                    value={formData.previous_loan_defaults_on_file}
                    onChange={(event) =>
                      updateField("previous_loan_defaults_on_file", event.target.value)
                    }
                  >
                    <option value="">Select previous defaults</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </label>
              </form>

              {error && <p className="error-message">{error}</p>}
            </section>
          </>
        )}

        {activeView === "dashboardDetail" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Dashboard / Application Review</p>
                <h2>
                  {selectedApplication
                    ? selectedApplication.form.applicant_name || "Unnamed Applicant"
                    : "No Application Selected"}
                </h2>
                <p className="subtext">
                  Review the model output, snapshot, recommendation, and what-if changes.
                </p>
              </div>

              <button
                className="primary-button secondary-button"
                type="button"
                onClick={() => setActiveView("dashboardList")}
              >
                Back to Dashboards
              </button>
            </header>

            {!selectedApplication || !displayedResult ? (
              <section className="panel empty-state">
                <h3>No dashboard selected</h3>
                <p>Go back to the dashboard list and choose an analyzed application.</p>
              </section>
            ) : (
              <>
                <section className="metric-grid">
                  <article className="metric-card">
                    <p>Approval Probability</p>
                    <strong>{formatPercent(approvalProbability)}</strong>
                    <span>
                      {approvalChange === 0
                        ? "Current model estimate"
                        : `${approvalChange > 0 ? "+" : ""}${formatPercent(
                            approvalChange
                          )} from original`}
                    </span>
                  </article>

                  <article className="metric-card warning">
                    <p>Default Risk</p>
                    <strong>{formatPercent(defaultRisk)}</strong>
                    <span>Statistical probability of default</span>
                  </article>

                  <article className="metric-card">
                    <p>Risk Tier</p>
                    <strong>{displayedResult.risk_tier}</strong>
                    <span>Based on the current scenario</span>
                  </article>

                  <article className="metric-card success">
                    <p>Recommendation</p>
                    <strong>{displayedResult.recommendation ?? "Review"}</strong>
                    <span>Decision support summary</span>
                  </article>
                </section>

                <div className="dashboard-grid">
                  <section className="panel simulator-panel">
                    <div className="panel-header">
                      <div>
                        <h3>What-If Simulator</h3>
                        <p>
                          Adjust key factors to see how the model output changes.
                          {isSimulating ? " Updating..." : ""}
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
                          onChange={(event) =>
                            updateSimulatorField("person_income", event.target.value)
                          }
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
                          onChange={(event) =>
                            updateSimulatorField("loan_amnt", event.target.value)
                          }
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
                          onChange={(event) =>
                            updateSimulatorField("loan_int_rate", event.target.value)
                          }
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
                          onChange={(event) =>
                            updateSimulatorField("credit_score", event.target.value)
                          }
                        />
                      </label>

                      <label className="slider-field">
                        <span>
                          Employment <strong>{simulatorData.person_emp_exp} years</strong>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={simulatorData.person_emp_exp}
                          onChange={(event) =>
                            updateSimulatorField("person_emp_exp", event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <aside className="panel summary-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Application Snapshot</h3>
                        <p>Original submitted application.</p>
                      </div>
                    </div>

                    <dl className="snapshot-list">
                      <div>
                        <dt>Name</dt>
                        <dd>{displayedApplication.applicant_name}</dd>
                      </div>
                      <div>
                        <dt>Income</dt>
                        <dd>{formatMoney(displayedApplication.person_income)}</dd>
                      </div>
                      <div>
                        <dt>Loan Amount</dt>
                        <dd>{formatMoney(displayedApplication.loan_amnt)}</dd>
                      </div>
                      <div>
                        <dt>Credit Score</dt>
                        <dd>{displayedApplication.credit_score}</dd>
                      </div>
                      <div>
                        <dt>Employment</dt>
                        <dd>{displayedApplication.person_emp_exp} years</dd>
                      </div>
                      <div>
                        <dt>Purpose</dt>
                        <dd>{formatIntent(displayedApplication.loan_intent)}</dd>
                      </div>
                    </dl>

                    <div className="recommendation-box">
                      <h4>Recommendation Summary</h4>
                      <p>
                        {displayedResult.recommendation
                          ? displayedResult.recommendation
                          : `This scenario is classified as ${displayedResult.risk_tier}. Compare the approval probability and default risk before making a final decision.`}
                      </p>
                    </div>
                  </aside>
                </div>

                {error && <p className="error-message dashboard-error">{error}</p>}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;