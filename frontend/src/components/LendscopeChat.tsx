// src/components/LendScopeChat.tsx
import { useState, type SyntheticEvent } from "react";
import "./LendScopeChat.css";

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
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode, 
          message: userMsg, 
          context_data: currentContext,
          history: updatedMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      
      const data = await res.json();
      setMessages([...updatedMessages, { sender: "assistant", text: data.reply, citations: data.citations }]);
    } catch{
      setMessages([...updatedMessages, { sender: "assistant", text: "❌ Failed to connect to backend server." }]);
    } finally {
      setLoading(false);
    }
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
            <p>{m.text}</p>
            {m.citations && m.citations.length > 0 && (
              <div className="chat-citations">
                {m.citations.map((c, i) => <small key={i}>📌 {c}</small>)}
              </div>
            )}
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