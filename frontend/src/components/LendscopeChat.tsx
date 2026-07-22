// src/components/LendScopeChat.tsx
import { useState, type SyntheticEvent } from "react";
import "./LendscopeChat.css";

type Message = { sender: "user" | "assistant"; text: string; citations?: string[] };

export default function LendScopeChat({ mode, currentContext }: { mode: "borrower" | "underwriter"; currentContext: Record<string, unknown> }) {
  // Separate history stores for each mode
  const [borrowerMessages, setBorrowerMessages] = useState<Message[]>([
    { 
      sender: "assistant", 
      text: "Hi there! I'm your LendScope financial coach. How can I help you optimize your loan readiness score?" 
    }
  ]);
  
  const [underwriterMessages, setUnderwriterMessages] = useState<Message[]>([
    { 
      sender: "assistant", 
      text: "Underwriter Policy Copilot (Llama 3.3) online. Ready to audit application parameters against lending ceilings." 
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Active messages pointer based on current mode prop
  const messages = mode === "borrower" ? borrowerMessages : underwriterMessages;
  const setMessages = mode === "borrower" ? setBorrowerMessages : setUnderwriterMessages;

  const handleSend = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    const updatedMessages = [...messages, { sender: "user" as const, text: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode, 
          message: userMsg, 
          context_data: currentContext,
          history: updatedMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      
      if (!response.ok) throw new Error(`Server returned status ${response.status}`);
      
      const data = await response.json();
      setMessages([...updatedMessages, { sender: "assistant", text: data.reply, citations: data.citations }]);
    } catch {
      setMessages([...updatedMessages, { sender: "assistant", text: "❌ Failed to connect to backend server." }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to turn raw LLM text with \n into clean structured JSX elements
  // Helper function to turn raw LLM text into clean structured JSX elements
  const formatMessageText = (text: string) => {
    // 1. Clean up literal backend escape strings if present
    const cleanedText = (text || "")
      .replaceAll("\\n\\n", "\n")
      .replaceAll("\\n", "\n");

    return cleanedText.split("\n").map((line, index) => {
      const trimmed = line.trim();

      if (trimmed === "") {
        return <div key={index} style={{ height: "6px" }} />;
      }

      // 2. Handle Markdown Headings (e.g., ## Your Current Profile)
      if (trimmed.startsWith("## ")) {
        return (
          <div key={index} style={{ fontWeight: 700, fontSize: "14px", marginTop: "12px", marginBottom: "4px", color: "#0f172a" }}>
            {trimmed.replace(/^##\s*/, "")}
          </div>
        );
      }

      // If a line starts with **, it's a bold header/title line
      if (trimmed.startsWith("**")) {
        const cleanLine = trimmed.replaceAll("**", "");
        return (
          <div key={index} style={{ fontWeight: 700, marginTop: "10px", marginBottom: "4px", color: "#0f172a" }}>
            {cleanLine}
          </div>
        );
      }

      // If it's a bullet point
      if (trimmed.startsWith("*") || trimmed.startsWith("-") || trimmed.startsWith("•")) {
        return (
          <div key={index} style={{ marginLeft: "12px", marginBottom: "4px" }}>
            • {trimmed.replace(/^[*-\s•]+/, "").replaceAll("**", "")}
          </div>
        );
      }

      // Standard text line (strips any stray ** just in case)
      return (
        <div key={index} style={{ marginBottom: "4px" }}>
          {line.replaceAll("**", "")}
        </div>
      );
    });
  };
  return (
    <div className={`lendscope-chat-panel ${mode}`}>
      <div className="chat-panel-header">
        <span className="chat-shield-icon">{mode === "borrower" ? "🤖" : "🛡️"}</span>
        <div className="chat-title-group">
          <h3>{mode === "borrower" ? "Borrower Financial Coach" : "Underwriter Policy Copilot (Llama 3.3)"}</h3>
          <p>{mode === "borrower" ? "Plain-English readiness & optimization assistant" : "Audit loan files against institutional compliance rules"}</p>
        </div>
      </div>

      <div className="chat-messages-container">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.sender}`}>
            {formatMessageText(m.text)}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <p className="typing-indicator">Analyzing records with Llama 3.3...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-bar">
        <input 
          type="text" 
          placeholder={mode === "borrower" ? "Ask about lowering your DTI ratio..." : "Audit application against Reg Z Ability-to-Repay..."} 
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit">➤</button>
      </form>
    </div>
  );
}