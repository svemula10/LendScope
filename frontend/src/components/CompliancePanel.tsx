// frontend/src/components/CompliancePanel.tsx
import { useState } from "react";

interface PolicyRule {
  rule_id: string;
  name: string;
  evaluated_metric: string;
  required_ceiling: string;
  status: "PASS" | "VIOLATION";
  citation: string;
}

interface RecommendationSummary {
  header: string;
  body: string;
  status: "SUCCESS" | "CRITICAL";
}

interface CompliancePanelProps {
  policyGuidelines: PolicyRule[];
  recommendationSummary: RecommendationSummary | null;
  uploadedFiles?: string[]; // Version 2 tracking asset list hook
}

export default function CompliancePanel({
  policyGuidelines,
  recommendationSummary,
  uploadedFiles = [] // Clean fallbacks
}: CompliancePanelProps) {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setExpandedRuleId(expandedRuleId === id ? null : id);
  };

  return (
    <div className="compliance-console" style={{ display: "grid", gap: "20px" }}>
      
      {/* Dynamic Document Recognition Group */}
      {uploadedFiles.length > 0 && (
        <div className="console-section">
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>
            Extracted Operational Assets
          </h4>
          <div style={{ display: "grid", gap: "6px" }}>
            {uploadedFiles.map((filename, idx) => (
              <div key={idx} style={{
                display: "flex", background: "#f8fafc", padding: "8px 12px", 
                borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px"
              }}>
                <span style={{ marginRight: "8px" }}>📄</span>
                <span style={{ fontWeight: 500, color: "#0f172a" }}>{filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RECOMMENDATION SUMMARY SECTION */}
      {recommendationSummary && (
        <div className="console-section">
          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Recommendation Summary
          </h4>
          <div style={{
            background: recommendationSummary.status === "SUCCESS" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${recommendationSummary.status === "SUCCESS" ? "#bbf7d0" : "#fecaca"}`,
            padding: "16px", borderRadius: "8px", display: "grid", gap: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>
                {recommendationSummary.status === "SUCCESS" ? "✅" : "⚠️"}
              </span>
              <h5 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: recommendationSummary.status === "SUCCESS" ? "#166534" : "#991b1b" }}>
                {recommendationSummary.header}
              </h5>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: recommendationSummary.status === "SUCCESS" ? "#1e293b" : "#334155", whiteSpace: "pre-line" }}>
              {recommendationSummary.body}
            </p>
          </div>
        </div>
      )}

      {/* 3. RELEVANT POLICY & GUIDELINES MATRIX */}
      <div className="console-section">
        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Relevant Policy & Guidelines
        </h4>
        <div style={{ display: "grid", gap: "10px" }}>
          {policyGuidelines.map((rule) => {
            const isExpanded = expandedRuleId === rule.rule_id;
            const isViolation = rule.status === "VIOLATION";

            return (
              <div 
                key={rule.rule_id} 
                onClick={() => toggleRule(rule.rule_id)}
                style={{
                  background: "#ffffff", border: `1px solid ${isExpanded ? "#4b6fff" : "#e2e8f0"}`,
                  borderRadius: "8px", cursor: "pointer", transition: "all 0.2s ease",
                  overflow: "hidden", display: "grid"
                }}
              >
                {/* Rule Header Row */}
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

                {/* Collapsible Citations Drawer Panel */}
                {isExpanded && (
                  <div style={{
                    padding: "14px", background: "#f8fafc", borderTop: "1px solid #e2e8f0",
                    fontSize: "12.5px", lineHeight: "1.6", color: "#334155"
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px", color: "#4b6fff", fontWeight: 600 }}>
                      <span>📂</span> RAG Source Citation Grounding:
                    </div>
                    <blockquote style={{ margin: 0, fontStyle: "italic", background: "#ffffff", padding: "10px", borderLeft: "3px solid #4b6fff", borderRadius: "4px" }}>
                      "{rule.citation}"
                    </blockquote>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}