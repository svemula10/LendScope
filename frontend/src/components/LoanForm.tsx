import type { SyntheticEvent } from "react";
import type { LoanForm as LoanFormType } from "../App";

interface LoanFormProps {
  formData: LoanFormType;
  updateField: (name: keyof LoanFormType, value: string) => void;
  handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string;
}

export default function LoanForm({
  formData,
  updateField,
  handleSubmit,
  isLoading,
  error,
}: LoanFormProps) {
  return (
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
              onChange={(event) => updateField("cb_person_cred_hist_length", event.target.value)}
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
            Previous Defaults
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
        </form>

        {error && <p className="error-message">{error}</p>}
      </section>
    </>
  );
}