// frontend/src/components/PolicyGuidelines.tsx
import { useState } from "react";

interface PolicyRule {
  rule_id: string;
  name: string;
  evaluated_metric: string;
  required_ceiling: string;
  status: "PASS" | "VIOLATION";
  summary_citation?: string;   
  full_text_citation?: string; 
  citation?: string;
}

interface PolicyGuidelinesProps {
  policyGuidelines: PolicyRule[];
}

export default function PolicyGuidelines({ policyGuidelines }: PolicyGuidelinesProps) {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  return (
    <div className="panel guidelines-card-container" style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      display: "grid",
      gap: "16px"
    }}>
      <div>
        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
          Relevant Policy & Guidelines
        </h3>
        <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
          Real-time compliance validation tracking baseline parameters.
        </p>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {policyGuidelines.map((rule) => {
          const isExpanded = expandedRuleId === rule.rule_id;
          const isViolation = rule.status === "VIOLATION";

          // Aligns the pipeline values cleanly to render seamlessly
          const massiveHandbookText = rule.full_text_citation || rule.citation || "Detailed reference documentation log matching this policy is loading.";

          return (
            <div 
              key={rule.rule_id} 
              onClick={() => setExpandedRuleId(isExpanded ? null : rule.rule_id)}
              style={{
                background: "#ffffff", 
                border: `1px solid ${isExpanded ? "#4b6fff" : "#e2e8f0"}`,
                borderRadius: "8px", 
                cursor: "pointer", 
                transition: "all 0.15s ease", 
                overflow: "hidden",
                display: "grid"
              }}
            >
              {/* Header Row */}
              <div style={{ padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>{rule.name}</span>
                  <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "#64748b" }}>
                    <span>{rule.evaluated_metric}</span>
                    <span>•</span>
                    <span>{rule.required_ceiling}</span>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                    background: isViolation ? "#fef2f2" : "#f0fdf4",
                    color: isViolation ? "#991b1b" : "#166534"
                  }}>
                    {rule.status}
                  </span>
                  <span style={{ fontSize: "12px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    ▼
                  </span>
                </div>
              </div>

 
              {/* RESTORED ACCORDION FORMATTING FROM THE ORIGINAL FILE SHAPE */}
              {isExpanded && (
                <div style={{
                  padding: "14px", background: "#f8fafc", borderTop: "1px solid #e2e8f0",
                  fontSize: "12.5px", lineHeight: "1.6", color: "#334155"
                }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "6px", color: "#4b6fff", fontWeight: 600 }}>
                    <span>📂</span>
                    <span>RAG Source Citation Grounding:</span>
                  </div>
                  <blockquote style={{ 
                    margin: 0, fontStyle: "italic", background: "#ffffff", padding: "12px", 
                    borderLeft: "3px solid #4b6fff", borderRadius: "4px", border: "1px solid #e2e8f0",
                    borderLeftWidth: "4px", maxHeight: "180px", overflowY: "auto", whiteSpace: "pre-wrap"
                  }}>
                    "{massiveHandbookText}"
                  </blockquote>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guidebook Reference Note */}
      <div style={{
        marginTop: "4px", padding: "12px 14px", background: "#f1f5f9", borderRadius: "8px",
        border: "1px dashed #cbd5e1", display: "flex", alignItems: "start", gap: "10px"
      }}>
        <span style={{ fontSize: "16px", lineHeight: "1" }}>🛡️</span>
        <span style={{ fontSize: "11.5px", color: "#475569", fontWeight: 500, lineHeight: "1.5" }}>
          <strong>Reference Notice:</strong> Evaluation parameters are checked against rules indexed from the official <strong>Fannie Mae Single Family Selling Guidebook</strong> on active conventional residential loans.
        </span>
      </div>
    </div>
  );
}