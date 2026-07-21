import type { LoanForm } from "../App";

interface BorrowerSnapshotProps {
  data: LoanForm;
}

export default function BorrowerSnapshot({ data }: BorrowerSnapshotProps) {
  const items = [
    { label: "Applicant", value: data.applicant_name || "Primary Applicant" },
    { label: "Age", value: data.person_age },
    { label: "Education", value: data.person_education },
    { label: "Annual Income", value: `$${data.person_income.toLocaleString()}` },
    { label: "Employment", value: `${data.person_emp_exp} years` },
    { label: "Home Ownership", value: data.person_home_ownership },
    { label: "Loan Amount", value: `$${data.loan_amnt.toLocaleString()}` },
    { label: "Interest Rate", value: `${data.loan_int_rate}%` },
    { label: "Intent", value: data.loan_intent },
    { label: "Credit Score", value: data.credit_score },
  ];

  return (
    <div className="panel" style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginTop: "16px",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    }}>
      <h3 style={{ 
        fontSize: "14px", 
        color: "#64748b", 
        marginBottom: "16px", 
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
        Original Application Snapshot
      </h3>

      <div style={{ display: "grid", gap: "1px", background: "#e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
        {items.map((item, index) => (
          <div key={item.label} style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            padding: "9px 14px", 
            background: index % 2 === 0 ? "#ffffff" : "#f8fafc" 
          }}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>{item.label}</span>
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}