import type { SyntheticEvent } from "react";
import type { LoanForm as LoanFormType, Mode } from "../App";
import DocumentUpload from "./DocumentUpload";

interface LoanFormProps {
  formData: LoanFormType;
  updateField: (name: keyof LoanFormType, value: string | number) => void;
  handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string;
  currentMode: Mode;
  onDocumentExtracted: (data: Partial<LoanFormType>) => void;
}

export default function LoanForm({
  formData,
  updateField,
  handleSubmit,
  isLoading,
  error,
  currentMode,
  onDocumentExtracted,
}: LoanFormProps) {
  const isBorrower = currentMode === "borrower";

  return (
    <div className="panel application-panel">
      {/* Restored to your classic V1 header styling with original matching emojis */}
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

      {/* The Upload Box sits directly in the panel frame */}
      <DocumentUpload onDocumentExtracted={onDocumentExtracted} />

      <form onSubmit={handleSubmit}>
        <div className="loan-form">
          <label>
            Applicant Full Name
            <input
              required
              type="text"
              //placeholder="John Doe"
              value={formData.applicant_name || ""}
              onChange={(event) => updateField("applicant_name", event.target.value)}
            />
          </label>

          <label>
            Age
            <input
              required
              type="number"
              min="18"
              max="120"
              //placeholder="30"
              value={formData.person_age || ""}
              onChange={(event) => updateField("person_age", event.target.value)}
            />
          </label>

          <label>
            Education Level
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
              <option value="Personal">Personal</option>
              <option value="Education">Education</option>
              <option value="Medical">Medical</option>
              <option value="Venture">Venture</option>
              <option value="Home Improvement">Home Improvement</option>
              <option value="Debt Consolidation">Debt Consolidation</option>
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
              <option value="Rent">Rent</option>
              <option value="Own">Own</option>
              <option value="Mortgage">Mortgage</option>
              <option value="Other">Other</option>
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
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button className="primary-button" type="submit" disabled={isLoading} style={{ width: "100%", marginTop: "24px" }}>
          {isLoading ? "Analyzing..." : isBorrower ? "Evaluate My Readiness" : "Analyze Application"}
        </button>
      </form>
    </div>
  );
}