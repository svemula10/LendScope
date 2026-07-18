// frontend/src/components/RecommendationSummary.tsx
interface RecommendationSummaryData {
  header: string;
  body: string;
  status: "SUCCESS" | "CRITICAL";
}

interface RecommendationSummaryProps {
  recommendationSummary: RecommendationSummaryData | null;
}

export default function RecommendationSummary({ recommendationSummary }: RecommendationSummaryProps) {
  if (!recommendationSummary) return null;

  const isSuccess = recommendationSummary.status === "SUCCESS";

  return (
    <div className="panel summary-card-container" style={{
      background: isSuccess ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      display: "grid",
      gap: "10px",
      marginBottom: "20px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px", lineHeight: "1" }}>
          {isSuccess ? "✅" : "⚠️"}
        </span>
        <h3 style={{ 
          margin: 0, 
          fontSize: "15px", 
          fontWeight: 700, 
          color: isSuccess ? "#166534" : "#991b1b" 
        }}>
          {recommendationSummary.header}
        </h3>
      </div>
      <p style={{ 
        margin: 0, 
        fontSize: "13.5px", 
        lineHeight: "1.6", 
        color: isSuccess ? "#14532d" : "#7f1d1d", 
        whiteSpace: "pre-line",
        fontWeight: 500
      }}>
        {recommendationSummary.body}
      </p>
    </div>
  );
}