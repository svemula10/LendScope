# backend/app/chat_service.py
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
            "You have access to the user's live loan simulation metrics provided in the context below. "
            "Use these exact figures (income, credit score, loan amount, etc.) to give tailored, "
            "personalized advice on their approval chances and DTI ratio."
        )
        
        self.underwriter_system_prompt = (
            "You are LendScope's Underwriter Policy Copilot (Powered by Llama 3.3). "
            "You have direct access to the application data packet provided in the context below. "
            "Audit these exact numbers against institutional risk ceilings and DTI thresholds. Cite exact policy rules."
        )

    def generate_response(self, mode: str, message: str, context_data: dict, history: list) -> dict:
        if not self.client:
            return {
                "reply": "⚠️ Backend Error: GROQ_API_KEY environment variable is not set in your terminal session.",
                "citations": []
            }

        is_borrower = mode.lower() == "borrower"
        system_prompt = self.borrower_system_prompt if is_borrower else self.underwriter_system_prompt

        # Format applicant live form context cleanly for Llama 3.3
        context_summary = "No active application form data found."
        if context_data and isinstance(context_data, dict):
            filtered_data = {k: v for k, v in context_data.items() if v is not None and v != ""}
            if filtered_data:
                context_summary = ", ".join([f"{k}: {v}" for k, v in filtered_data.items()])

        messages = [
            {
                "role": "system", 
                "content": f"{system_prompt}\n\n[APPLICANT LIVE FORM CONTEXT]:\n{context_summary}"
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