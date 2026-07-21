// src/App.tsx
import { type SyntheticEvent, useEffect, useState } from "react";
import "./App.css";
import { jsPDF } from "jspdf"; // <-- FEATURE C: Client-Side PDF Generation Package

import Sidebar from "./components/Sidebar";
import LoanForm from "./components/LoanForm";
import MetricGrid from "./components/MetricGrid";
import WhatIfSimulator from "./components/WhatIfSimulator";
import RecommendationSummary from "./components/RecommendationSummary";
import PolicyGuidelines from "./components/PolicyGuidelines";
import BorrowerSnapshot from "./components/BorrowerSnapshot";
import MonthlyRepaymentCalculator from "./components/MonthlyRepaymentCalculator";
import LendScopeChat from "./components/LendscopeChat";

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

// version 3
export type PolicyRule = {
  rule_id: string;
  name: string;
  evaluated_metric: string;
  required_ceiling: string;
  status: "PASS" | "VIOLATION";
  summary_citation: string;   // <-- Update this to match CompliancePanel.tsx
  full_text_citation: string;
};

// version 3
export type RecommendationSummary = {
  header: string;
  body: string;
  status: "SUCCESS" | "CRITICAL";
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
  const normalizedIntent = form.loan_intent.toLowerCase();

  return {
    person_age: form.person_age,
    person_income: form.person_income,
    person_emp_exp: form.person_emp_exp,
    person_education: form.person_education,
    person_gender: form.person_gender,
    person_home_ownership: form.person_home_ownership,
    loan_amnt: form.loan_amnt,
    loan_int_rate: form.loan_int_rate,
    credit_score: form.credit_score,
    loan_intent: normalizedIntent as PredictionPayload["loan_intent"],
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

  const [policyGuidelines, setPolicyGuidelines] = useState<PolicyRule[]>([]);
  const [recommendationSummary, setRecommendationSummary] = useState<RecommendationSummary | null>(null);

  const selectedApplication =
    savedApplications.find((application) => application.id === selectedApplicationId) ?? null;

  const displayedResult = simulatorResult ?? selectedApplication?.result ?? result;
  const baselineResult = selectedApplication?.result ?? result;
  const baselineApproval = baselineResult?.approval_probability ?? 0;
  const approvalProbability = displayedResult?.approval_probability ?? 0;
  const defaultRisk = displayedResult?.statistical_pd ?? 0;
  const approvalChange = displayedResult
    ? displayedResult.approval_probability - baselineApproval
    : 0;

  // PIPELINE MATH: Calculate monthly payment inside parent to feed downstream Feature D
  const simLoan = simulatorData.loan_amnt || 0;
  const simRate = simulatorData.loan_int_rate || 0;
  const simRateMonthly = simRate / 100 / 12;
  const simPayment = (simLoan > 0 && simRateMonthly > 0)
    ? (simLoan * simRateMonthly * Math.pow(1 + simRateMonthly, 36)) / (Math.pow(1 + simRateMonthly, 36) - 1)
    : simLoan / 36;

  const handleDocumentExtraction = (extracted: Partial<LoanForm>) => {
    setFormData((current) => {
      const updated = { ...current };

      const safeUpdate = <K extends keyof LoanForm>(
        key: K,
        extractedValue: LoanForm[K] | undefined
      ) => {
        const isCurrentEmpty = !current[key] || current[key] === 0 || current[key] === "";
        const isNewValid = extractedValue !== undefined && extractedValue !== null && extractedValue !== "";
        
        if (isCurrentEmpty && isNewValid) {
          updated[key] = extractedValue as LoanForm[K];
        }
      };

      safeUpdate("applicant_name", extracted.applicant_name);
      safeUpdate("person_age", extracted.person_age);
      safeUpdate("person_income", extracted.person_income);
      safeUpdate("person_emp_exp", extracted.person_emp_exp);
      safeUpdate("person_education", extracted.person_education);
      safeUpdate("person_gender", extracted.person_gender);
      safeUpdate("person_home_ownership", extracted.person_home_ownership);
      safeUpdate("loan_amnt", extracted.loan_amnt);
      safeUpdate("loan_int_rate", extracted.loan_int_rate);
      safeUpdate("loan_intent", extracted.loan_intent);
      safeUpdate("credit_score", extracted.credit_score);
      safeUpdate("cb_person_cred_hist_length", extracted.cb_person_cred_hist_length);
      safeUpdate("previous_loan_defaults_on_file", extracted.previous_loan_defaults_on_file);

      return updated;
    });
  };

  // FEATURE C: Client-Side jsPDF Report Compiler Function
  function exportAuditPDF() {
    if (!selectedApplication) return;
    
    const doc = new jsPDF();
    const appForm = selectedApplication.form;
    const appRes = selectedApplication.result;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(8, 23, 51);
    doc.text("LendScope Underwriting Audit Brief", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(99, 112, 138);
    doc.text(`Generated Verification Date: ${new Date().toLocaleString()}`, 14, 27);
    doc.text(`System Reference ID: TS-${selectedApplication.id}`, 14, 32);
    
    doc.setDrawColor(226, 232, 243);
    doc.line(14, 38, 196, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 32, 51);
    doc.text("1. Model Risk Assessment Decisions", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Applicant Name Target: ${appForm.applicant_name}`, 14, 58);
    doc.text(`Model Approval Probability: ${formatPercent(appRes.approval_probability)}`, 14, 65);
    doc.text(`Statistical Probability of Default (PD): ${formatPercent(appRes.statistical_pd)}`, 14, 72);
    doc.text(`Assigned Risk Classification Tier: ${appRes.risk_tier}`, 14, 79);
    doc.text(`Underwriter Decision Directive: ${appRes.recommendation ?? "Under Review"}`, 14, 86);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("2. Verified Applicant Snapshots Parameters", 14, 102);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Declared Stated Income: ${formatMoney(appForm.person_income)}`, 14, 112);
    doc.text(`Allocation Limit Requested: ${formatMoney(appForm.loan_amnt)}`, 14, 119);
    doc.text(`Assigned Baseline Credit Score: ${appForm.credit_score}`, 14, 126);
    doc.text(`Employment Experience Value: ${appForm.person_emp_exp} years`, 14, 133);
    doc.text(`Target Context Stated Intent: ${formatIntent(appForm.loan_intent)}`, 14, 140);
    doc.text(`Home Ownership Record Status: ${appForm.person_home_ownership}`, 14, 147);

    doc.save(`LendScope-AuditBrief-ID-${selectedApplication.id}.pdf`);
  }

  function startNewApplication() {
    setFormData(emptyForm);
    setError("");
    setResult(null);
    setSimulatorResult(null);
    setSelectedApplicationId(null);
    setPolicyGuidelines([]);
    setRecommendationSummary(null);
    setActiveView("application");
  }

  function resetForm() {
    setFormData(emptyForm);
    setError("");
  }

  function updateField(name: keyof LoanForm, value: string | number) {
    setFormData((current) => {
      let parsedValue: number | string = value;
      if (numericFields.includes(name)) {
        const valueAsNumber = typeof value === "string" ? Number(value) : value;
        parsedValue = name === "loan_int_rate" ? valueAsNumber : Math.round(valueAsNumber);
      }
      return { ...current, [name]: parsedValue };
    });
  }

  function updateSimulatorField(name: keyof LoanForm, value: string | number) {
    setSimulatorData((current) => {
      let parsedValue: number | string = value;
      if (numericFields.includes(name)) {
        const valueAsNumber = typeof value === "string" ? Number(value) : value;
        parsedValue = name === "loan_int_rate" ? valueAsNumber : Math.round(valueAsNumber);
      }
      return { ...current, [name]: parsedValue };
    });
  }

  async function predict(application: LoanForm) {
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(application)),
    });
    if (!response.ok) throw new Error("Prediction request failed.");
    return (await response.json()) as PredictionResult;
  }

  // version 3: Orchestrates ML prediction payload calculations alongside compliance text retrievals
  async function runFullAnalysis(applicationData: LoanForm) {
    setIsLoading(true);
    setError("");
    try {
      const API_BASE = "http://localhost:8000";

      // 1. Fetch ML Prediction Base Values First
      const riskResponse = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(applicationData)),
      });
      if (!riskResponse.ok) throw new Error("Risk API issue.");
      const riskData = await riskResponse.json();

      // 2. Feed ML Output Insights over the wire to sync the RAG Template Generation Notice Cards!
      const complianceResponse = await fetch(`${API_BASE}/api/predict/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...applicationData,
          mode: currentMode,
          ml_probability: riskData.approval_probability, // Handed down dynamically
          ml_risk_tier: riskData.risk_tier               // Handed down dynamically
        }),
      });
      if (!complianceResponse.ok) throw new Error("Compliance API issue.");
      const complianceData = await complianceResponse.json();

      // Set Master State Matrix
      setResult(riskData);
      setSimulatorResult(riskData);
      setSimulatorData(applicationData);
      setPolicyGuidelines(complianceData.policy_guidelines);
      setRecommendationSummary(complianceData.recommendation_summary);

      setActiveView("dashboardDetail");
    } catch {
      setError("Could not communicate with the underwriting servers.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: SyntheticEvent<Element>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.person_emp_exp >= formData.person_age) {
      setError("Logical Error: Employment experience cannot be equal to or greater than your total age.");
      setIsLoading(false);
      return;
    }

    if (formData.person_age - formData.person_emp_exp < 14) {
      setError(`Logical Error: Entering ${formData.person_emp_exp} years of work history at age ${formData.person_age} implies working before age 14. Please check your inputs.`);
      setIsLoading(false);
      return;
    }

    if (formData.cb_person_cred_hist_length >= formData.person_age) {
      setError("Logical Error: Credit history length cannot be longer than your age.");
      setIsLoading(false);
      return;
    }

    if (formData.person_age - formData.cb_person_cred_hist_length < 18) {
      setError("Logical Error: Credit history cannot begin before age 18. Please adjust your age or credit history length.");
      setIsLoading(false);
      return;
    }

    try {
      // Parallel routing logic used inside first-time submissions to speed up dashboard initial load
      const API_BASE = "http://localhost:8000";
      const [riskResponse, complianceResponse] = await Promise.all([
        fetch(`${API_BASE}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(formData)),
        }),
        fetch(`${API_BASE}/api/predict/compliance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, mode: currentMode }),
        })
      ]);

      if (!riskResponse.ok || !complianceResponse.ok) throw new Error("Processing error.");
      
      const riskData = await riskResponse.json();
      const complianceData = await complianceResponse.json();

      const newApplication: SavedApplication = {
        id: Date.now(),
        form: formData,
        result: riskData,
      };

      setSavedApplications((current) => [newApplication, ...current]);
      setSelectedApplicationId(newApplication.id);
      setResult(riskData);
      setSimulatorResult(riskData);
      setSimulatorData(formData);
      setPolicyGuidelines(complianceData.policy_guidelines);
      setRecommendationSummary(complianceData.recommendation_summary);
      setActiveView("dashboardDetail");
    } catch {
      setError("Could not connect to the backend. Make sure FastAPI is running on http://localhost:8000.");
    } finally {
      setIsLoading(false);
    }
  }

  function openDashboard(application: SavedApplication) {
    setSelectedApplicationId(application.id);
    setSimulatorData(application.form);
    setError("");
    // Re-evaluates compliance calculations parallel with mode variables definitions
    runFullAnalysis(application.form);
  }

  function deleteDashboard(applicationId: number) {
    setSavedApplications((current) => current.filter((app) => app.id !== applicationId));
    if (selectedApplicationId === applicationId) {
      setSelectedApplicationId(null);
      setResult(null);
      setSimulatorResult(null);
      setPolicyGuidelines([]);
      setRecommendationSummary(null);
      setActiveView("dashboardList");
    }
  }

  useEffect(() => {
    if (!selectedApplication || activeView !== "dashboardDetail") return;
    
    const timeoutId = window.setTimeout(async () => {
      setIsSimulating(true);
      try {
        const API_BASE = "http://localhost:8000";

        // 1. ✅ CALL THE HELPER FUNCTION HERE (This marks it as used and clears the lint flag)
        const riskData = await predict(simulatorData);

        // 2. Run your parallel compliance check using the helper's calculated inputs
        const complianceResponse = await fetch(`${API_BASE}/api/predict/compliance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...simulatorData,
            mode: currentMode,
            ml_probability: riskData.approval_probability,
            ml_risk_tier: riskData.risk_tier
          }),
        });
        if (!complianceResponse.ok) throw new Error("Simulator Compliance API failure.");
        const complianceData = await complianceResponse.json();

        // 3. Mutate master reactive states
        setSimulatorResult(riskData);
        setPolicyGuidelines(complianceData.policy_guidelines);
        setRecommendationSummary(complianceData.recommendation_summary);
        setError("");
      } catch {
        setError("The simulator could not update semantic compliance indexes.");
      } finally {
        setIsSimulating(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [simulatorData, selectedApplication, activeView, currentMode]);
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
                      <p>{formatMoney(application.form.loan_amnt)} request · Credit score {application.form.credit_score}</p>
                    </div>
                    <div className="dashboard-list-metrics">
                      <span>{formatPercent(application.result.approval_probability)} score probability</span>
                      <span>{application.result.risk_tier}</span>
                    </div>
                    <div className="dashboard-card-actions">
                      <button className="primary-button secondary-button" type="button" onClick={() => openDashboard(application)}>Open Dashboard</button>
                      <button className="delete-button" type="button" onClick={() => deleteDashboard(application.id)}>Delete</button>
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
            currentMode={currentMode as Mode}
            onDocumentExtracted={handleDocumentExtraction}
            onReset={resetForm}
          />
        )}

        {activeView === "dashboardDetail" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Dashboard / Evaluation Snapshot</p>
                <h2>{selectedApplication ? selectedApplication.form.applicant_name || "Unnamed Scenario Ledger" : "No Data Profile Selected"}</h2>
                <p className="subtext">Analyze underlying prediction metrics, operational balances, and sandbox variables.</p>
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                {currentMode === "underwriter" && (
                  <button className="primary-button" style={{ boxShadow: "none" }} type="button" onClick={exportAuditPDF}>
                    Export Audit PDF Brief
                  </button>
                )}
                <button className="primary-button secondary-button" type="button" onClick={() => setActiveView("dashboardList")}>Return to Archive List</button>
              </div>
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
                  annualIncome={simulatorData.person_income}
                  simulatedPayment={simPayment}
                />

                {/* THE CORRECT TWO-COLUMN SIDE-BY-SIDE GRID */}
                <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
                  
                  <aside className="panel operations-console-sidebar left-sidebar" style={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }}>
                    
                    {/* Left Column: Sliders Sandbox */}
                    <WhatIfSimulator
                      simulatorData={simulatorData}
                      updateSimulatorField={updateSimulatorField}
                      isSimulating={isSimulating}
                      formatMoney={formatMoney}
                      currentMode={currentMode}
                      approvalProbability={approvalProbability}
                    />

                    {/* Monthly Repayment Calculator */}
                    
                    {currentMode === "borrower" && (
                      <MonthlyRepaymentCalculator
                        loanAmount={simulatorData.loan_amnt}
                        annualRate={simulatorData.loan_int_rate}
                        formatMoney={formatMoney}
                      />
                    )}

                    <BorrowerSnapshot data={formData} />                    

                  </aside>


                  {/* Right Column Layout Sidebar Frame */}
                  <aside className="panel operations-console-sidebar" style={{ background: "transparent", border: "none", padding: 0, boxShadow: "none", display: "flex", flexDirection: "column", height:"100%"}}>
                    
                    {/* Box 1 Component */}
                    <RecommendationSummary recommendationSummary={recommendationSummary} />

                    {/* Box 2 Component */}
                    <PolicyGuidelines policyGuidelines={policyGuidelines} />


                    <LendScopeChat 
                      mode={currentMode} 
                      currentContext={{
                        baseline: formData,         // Original extracted/submitted application data
                        simulated: simulatorData    // Live what-if slider modifications
                      }}
                    />

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