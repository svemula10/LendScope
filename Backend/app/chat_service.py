import os
from dotenv import load_dotenv
from groq import Groq, GroqError

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

class ChatOrchestrator:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        self.model_name = "llama-3.3-70b-versatile"
        
        self.borrower_system_prompt = (
            "You are LendScope's Borrower Assistant, a friendly financial coach. "
            "You have access to both the user's ORIGINAL application baseline and their active WHAT-IF SIMULATOR state. "
            "Compare them when appropriate so the user understands how their slider changes impact their profile relative to reality."
        )
        
        self.underwriter_system_prompt = (
            "You are LendScope's Underwriter Policy Copilot (Powered by Llama 3.3). "
            "You have access to both the ORIGINAL unedited applicant record and the active SIMULATION audit parameters. "
            "Audit these figures against institutional lending policies and flag any risky deviations."
        )

    def generate_response(self, mode: str, message: str, context_data: dict, history: list) -> dict:
        if not self.client:
            return {
                "reply": "⚠️ Backend Error: GROQ_API_KEY environment variable is not set in your terminal session.",
                "citations": []
            }

        is_borrower = mode.lower() == "borrower"
        system_prompt = self.borrower_system_prompt if is_borrower else self.underwriter_system_prompt

        # Safely extract baseline vs simulated packages
        baseline = context_data.get("baseline", {}) if isinstance(context_data, dict) else {}
        simulated = context_data.get("simulated", {}) if isinstance(context_data, dict) else {}

        baseline_text = ", ".join([f"{k}: {v}" for k, v in baseline.items() if v is not None]) or "N/A"
        simulated_text = ", ".join([f"{k}: {v}" for k, v in simulated.items() if v is not None]) or "N/A"

        context_payload = (
            f"[ORIGINAL APPLICATION BASELINE DATA]:\n{baseline_text}\n\n"
            f"[ACTIVE WHAT-IF SIMULATOR STATE]:\n{simulated_text}"
        )

        messages = [
            {
                "role": "system", 
                "content": f"{system_prompt}\n\n{context_payload}"
            }
        ]

        for h in history:
            messages.append({"role": h["sender"], "content": h["text"]})
        messages.append({"role": "user", "content": message})

        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.3,
                max_completion_tokens=1024
            )
            reply_text = completion.choices[0].message.content
        except GroqError as ge:
            reply_text = f"Groq API Error: {str(ge)}"
        except Exception as e:
            reply_text = f"Unexpected Error: {str(e)}"

        return {
            "reply": reply_text,
            "citations": ["Borrower Optimization Guide"] if is_borrower else ["Reg Z Ability-to-Repay", "LendScope Risk Engine"]
        }

chat_orchestrator = ChatOrchestrator()