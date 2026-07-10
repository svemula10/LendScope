import { type SyntheticEvent, useEffect, useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import LoanForm from "./components/LoanForm";
import MetricGrid from "./components/MetricGrid";
import WhatIfSimulator from "./components/WhatIfSimulator";

export type View = "application" | "dashboardList" | "dashboardDetail";
export type Mode = "borrower" | "underwriter";

export type LoanForm = {
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

export type PredictionPayload = Omit<LoanForm, "applicant_name">;

export type PredictionResult = {
  approval_probability: number;
  statistical_pd: number;
  risk_tier: string;
  recommendation?: string;
};

export type SavedApplication = {
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

// Fallback defaults prevent payload fragmentation during borrower profile initialization
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

// Render currency formatting for simple numbers
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
  const [currentMode, setCurrentMode] = useState<Mode>("borrower");
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
    setFormData((current) => {
      let parsedValue: number | string = value;
      
      if (numericFields.includes(name)) {
        // Keep the decimal float for interest rates, but cleanly snap everything else to whole integers
        parsedValue = name === "loan_int_rate" ? Number(value) : Math.round(Number(value));
      }
      
      return {
        ...current,
        [name]: parsedValue,
      };
    });
  }

  function updateSimulatorField(name: keyof LoanForm, value: string) {
    setSimulatorData((current) => {
      let parsedValue: number | string = value;
      
      if (numericFields.includes(name)) {
        // Match the same clean rounding strategy inside your slider states
        parsedValue = name === "loan_int_rate" ? Number(value) : Math.round(Number(value));
      }
      
      return {
        ...current,
        [name]: parsedValue,
      };
    });
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

  function deleteDashboard(applicationId: number) {
    setSavedApplications((current) =>
      current.filter((application) => application.id !== applicationId)
    );

    if (selectedApplicationId === applicationId) {
      setSelectedApplicationId(null);
      setResult(null);
      setSimulatorResult(null);
      setActiveView("dashboardList");
    }
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
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        startNewApplication={startNewApplication}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

      <main className="main-content">
        {activeView === "dashboardList" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{currentMode === "borrower" ? "Applicant Center" : "Management Registries"}</p>
                <h2>{currentMode === "borrower" ? "My Evaluation History" : "Application Registry"}</h2>
                <p className="subtext">
                  {currentMode === "borrower" 
                    ? "Access and review your previously generated platform scenarios." 
                    : "Access underlying risk portfolios and underwriting audit snapshots."}
                </p>
              </div>

              <button className="primary-button" type="button" onClick={startNewApplication}>
                {currentMode === "borrower" ? "New Scenario Estimate" : "New Application Underwrite"}
              </button>
            </header>

            {savedApplications.length === 0 ? (
              <section className="panel empty-state">
                <h3>No data points tracked</h3>
                <p>Initialize an evaluation execution card to populate this dashboard view.</p>
              </section>
            ) : (
              <section className="dashboard-list">
                {savedApplications.map((application) => (
                  <article className="panel dashboard-list-card" key={application.id}>
                    <div>
                      <h3>{application.form.applicant_name || "Unnamed Scenario"}</h3>
                      <p>
                        {formatMoney(application.form.loan_amnt)} request · Credit score{" "}
                        {application.form.credit_score}
                      </p>
                    </div>

                    <div className="dashboard-list-metrics">
                      <span>{formatPercent(application.result.approval_probability)} score probability</span>
                      <span>{application.result.risk_tier}</span>
                    </div>

                    <div className="dashboard-card-actions">
                      <button
                        className="primary-button secondary-button"
                        type="button"
                        onClick={() => openDashboard(application)}
                      >
                        Open Dashboard
                      </button>

                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteDashboard(application.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}

        {activeView === "application" && (
          <LoanForm
            formData={formData}
            updateField={updateField}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            currentMode={currentMode}
          />
        )}

        {activeView === "dashboardDetail" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Dashboard / Evaluation Snapshot</p>
                <h2>
                  {selectedApplication
                    ? selectedApplication.form.applicant_name || "Unnamed Scenario Ledger"
                    : "No Data Profile Selected"}
                </h2>
                <p className="subtext">
                  Analyze underlying prediction metrics, operational balances, and sandbox variables.
                </p>
              </div>

              <button
                className="primary-button secondary-button"
                type="button"
                onClick={() => setActiveView("dashboardList")}
              >
                Return to Archive List
              </button>
            </header>

            {!selectedApplication || !displayedResult ? (
              <section className="panel empty-state">
                <h3>No transaction ledger active</h3>
                <p>Select an archive dashboard tracking file from the master registry console panel.</p>
              </section>
            ) : (
              <>
                <MetricGrid
                  approvalProbability={approvalProbability}
                  approvalChange={approvalChange}
                  defaultRisk={defaultRisk}
                  riskTier={displayedResult.risk_tier}
                  recommendation={displayedResult.recommendation ?? "Hold / Under Review"}
                  formatPercent={formatPercent}
                  currentMode={currentMode}
                />

                <div className="dashboard-grid">
                  <WhatIfSimulator
                    simulatorData={simulatorData}
                    updateSimulatorField={updateSimulatorField}
                    isSimulating={isSimulating}
                    formatMoney={formatMoney}
                  />

                  <aside className="panel summary-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Application Parameters</h3>
                        <p>Immutable entry parameters logged.</p>
                      </div>
                    </div>

                    <dl className="snapshot-list">
                      <div>
                        <dt>Profile Label</dt>
                        <dd>{displayedApplication.applicant_name}</dd>
                      </div>
                      <div>
                        <dt>Base Declared Income</dt>
                        <dd>{formatMoney(displayedApplication.person_income)}</dd>
                      </div>
                      <div>
                        <dt>Stated Allocation Limit</dt>
                        <dd>{formatMoney(displayedApplication.loan_amnt)}</dd>
                      </div>
                      <div>
                        <dt>Credit Metric Score</dt>
                        <dd>{displayedApplication.credit_score}</dd>
                      </div>
                      <div>
                        <dt>Stated History Length</dt>
                        <dd>{displayedApplication.person_emp_exp} years</dd>
                      </div>
                      <div>
                        <dt>Transaction Context Target</dt>
                        <dd>{formatIntent(displayedApplication.loan_intent)}</dd>
                      </div>
                    </dl>

                    <div className="recommendation-box">
                      <h4>Platform Strategy Insight</h4>
                      <p>
                        {displayedResult.recommendation
                          ? displayedResult.recommendation
                          : `The target vector metrics generate an assignment level categorized within ${displayedResult.risk_tier}. Interlock baseline scores against simulator tracks to target safe tier migration loops.`}
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