// src/components/MonthlyRepaymentCalculator.tsx
import { useState } from "react";

interface MonthlyRepaymentCalculatorProps {
  loanAmount: number;
  annualRate: number;
  formatMoney: (value: number) => string;
}

export default function MonthlyRepaymentCalculator({
  loanAmount,
  annualRate,
  formatMoney,
}: MonthlyRepaymentCalculatorProps) {
  const [termMonths, setTermMonths] = useState<number>(36);

  const monthlyRate = annualRate / 100 / 12;
  let monthlyRepayment = 0;
  
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyRepayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  } else if (loanAmount > 0) {
    monthlyRepayment = loanAmount / termMonths;
  }

  const totalPayoff = monthlyRepayment * termMonths;
  const totalInterest = totalPayoff - loanAmount;

  return (
    <div className="panel" style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginTop: "24px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
    }}>
      {/* Header & Term Selector Row */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "16px", 
        flexWrap: "wrap", 
        gap: "10px" 
      }}>
        <h3 style={{ 
          fontSize: "14px", 
          color: "#081733", 
          margin: 0, 
          fontWeight: 700, 
          textTransform: "uppercase", 
          letterSpacing: "0.025em" 
        }}>
          Monthly Repayment Schedule
        </h3>
        
        {/* Term Selector Pills matching app accent theme (#4b6fff) */}
        <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
          {[12, 24, 36, 48, 60].map((months) => (
            <button
              key={months}
              onClick={() => setTermMonths(months)}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: termMonths === months ? "#4b6fff" : "transparent",
                color: termMonths === months ? "#ffffff" : "#475569",
                transition: "all 0.2s ease"
              }}
            >
              {months}m
            </button>
          ))}
        </div>
      </div>

      {/* Financial Breakdown Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        
        {/* Monthly Payment Box */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px" }}>
          <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
            Monthly ({termMonths}m)
          </div>
          <div style={{ color: "#081733", fontSize: "15px", fontWeight: 800 }}>
            {formatMoney(monthlyRepayment)}
          </div>
        </div>

        {/* Total Interest Box */}
        <div style={{ background: "#fff5f5", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px" }}>
          <div style={{ color: "#991b1b", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
            Total Interest
          </div>
          <div style={{ color: "#b91c1c", fontSize: "15px", fontWeight: 800 }}>
            {formatMoney(totalInterest)}
          </div>
        </div>

        {/* Total Payoff Cost Box */}
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px" }}>
          <div style={{ color: "#166534", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
            Total Payoff
          </div>
          <div style={{ color: "#15803d", fontSize: "15px", fontWeight: 800 }}>
            {formatMoney(totalPayoff)}
          </div>
        </div>

      </div>
    </div>
  );
}