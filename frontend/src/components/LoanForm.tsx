import type { SyntheticEvent } from "react";
import type { LoanForm as LoanFormType, Mode } from "../App";
import DocumentUpload from "./DocumentUpload"; // <-- ADDED V2 BINDING

interface LoanFormProps {
  formData: LoanFormType;
  updateField: (name: keyof LoanFormType, value: string) => void;
  handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string;
  currentMode: Mode;
  onDocumentExtracted: (extractedData: Partial<LoanFormType>) => void; // <-- ADDED V2 PROPERTY
}

export default function LoanForm({
  formData,
  updateField,
  handleSubmit,
  isLoading,
  error,
  currentMode,
  onDocumentExtracted, // <-- Destructured here
}: LoanFormProps) {
  const isBorrower = currentMode === "borrower";

  return (
    <>
      <div className="panel application-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">
              {isBorrower ? "Readiness Check / New Simulation" : "Applications / New Review"}
            </span>
            <h3>{isBorrower ? "Check My Loan Readiness" : "New Loan Application"}</h3>
            <p className="subtext">
              {isBorrower
                ? "Enter your exact background and financial details to estimate your personal approval trajectory."
                : "Enter borrower details, run the risk model, then review the compliance dashboard."}
            </p>
          </div>
        </div>

        {/* --- ADDED V2 FEATURE: SINGLE UPLOAD COMPONENT OVER ENTRY GRID --- */}
        <DocumentUpload onDocumentExtracted={onDocumentExtracted} />

        <form onSubmit={handleSubmit} className="loan-form">
          <label>
            Applicant Full Name
            <input
              required
              type="text"
              //placeholder="e.g. Alex Rivera"
              value={formData.applicant_name}
              onChange={(event) => updateField("applicant_name", event.target.value)}
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
            Employment Experience (Years)
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
            Loan Amount Requested
            <input
              required
              type="number"
              min="0"
              value={formData.loan_amnt || ""}
              onChange={(event) => updateField("loan_amnt", event.target.value)}
            />
          </label>

          <label>
            Interest Rate (%)
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
            Credit History Length (Years)
            <input
              required
              type="number"
              min="0"
              value={formData.cb_person_cred_hist_length || ""}
              onChange={(event) => updateField("cb_person_cred_hist_length", event.target.value)}
            />
          </label>

          <label>
            Loan Purpose / Intent
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
            Home Ownership Status
            <select
              required
              value={formData.person_home_ownership}
              onChange={(event) => updateField("person_home_ownership", event.target.value)}
            >
              <option value="">Select home ownership</option>
              <option value="RENT">Rent</option>
              <option value="OWN">Own</option>
              <option value="MORTGAGE">Mortgage</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label>
            Previous Historical Defaults
            <select
              required
              value={formData.previous_loan_defaults_on_file}
              onChange={(event) => updateField("previous_loan_defaults_on_file", event.target.value)}
            >
              <option value="">Select previous defaults</option>
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </label>

          <div style={{ gridColumn: "span 2", marginTop: "12px" }}>
            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing..." : isBorrower ? "Evaluate My Readiness" : "Analyze Application"}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>
    </>
  );
}