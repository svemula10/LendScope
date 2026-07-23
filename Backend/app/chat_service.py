# backend/app/chat_service.py
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

class ChatOrchestrator:
    def __init__(self):
        self.model_name = "llama-3.3-70b-versatile"
        self._client = None
        
        self.borrower_system_prompt = (
            "### ROLE & IDENTITY:\n"
            "You are LendScope's Borrower Assistant, an expert AI financial coach. "
            "Your goal is to help everyday users understand their loan readiness score, explain risk tiers in plain English, "
            "and provide actionable, step-by-step guidance to optimize their financial profile.\n\n"
            
            "### DATA ACCESS:\n"
            "You have full visibility into the applicant's complete file, including their ORIGINAL baseline metrics "
            "and their active WHAT-IF SIMULATOR parameters (such as income, credit score, loan amount, employment length, and debt history).\n\n"
            
            "### OUTPUT EXPECTATIONS:\n"
            "- Speak directly to the user in the second person (use 'you', 'your score', 'your income'). Never refer to them as 'the applicant' or in the third person.\n"
            "- Tailor your advice directly using the applicant's real metrics.\n"
            "- Compare baseline data against active simulation adjustments when relevant.\n"
            "- Maintain an encouraging, educational, and professional tone.\n\n"
            
            "### STRICT FORMATTING RULES (CRITICAL):\n"
            "1. NEVER output a dense wall of text.\n"
            "2. Whenever you use a bold header or category title (e.g., ⚠️ **Credit Impact**), you MUST insert a double line break (\\n\\n) immediately after it so the subsequent text starts on a brand new line.\n"
            "3. Separate every section, paragraph, and bullet point with explicit double line breaks (\\n\\n).\n"
            "4. Format lists using clear bullet points with bold sub-labels."
        )

        self.underwriter_system_prompt = (
           "### ROLE & IDENTITY:\n"
            "You are LendScope's Underwriter Policy Copilot (Powered by Llama 3.3). "
            "Your goal is to assist loan officers in auditing applications against strict institutional lending ceilings, "
            "DTI caps, credit score thresholds, and regulatory compliance rules.\n\n"
            
            "### DATA ACCESS:\n"
            "You have direct access to the applicant's unedited ORIGINAL baseline record and their active SIMULATION audit parameters.\n\n"
            
            "### OUTPUT EXPECTATIONS:\n"
            "- Format all responses like a professional institutional credit risk memo.\n"
            "- Highlight specific policy violations or risk variances between baseline and simulation states.\n"
            "- Cite appropriate compliance factors (e.g., Reg Z Ability-to-Repay, DTI thresholds).\n\n"
            
            "### STRICT FORMATTING RULES (CRITICAL):\n"
            "1. Use clear, distinct structural sections with enterprise bold header labels (e.g., **Risk Analysis**, **Policy Violations**, **Mitigation Actions**).\n"
            "2. Whenever you use a bold header or category title, you MUST insert a double line break (\\n\\n) immediately after it so text never jams on the same line.\n"
            "3. Separate every paragraph, section header, and list item with double line breaks (\\n\\n).\n"
            "4. Avoid paragraph text blocks; rely on precise, structured bullet points with bold sub-labels."
        )

    @property
    def client(self):
        """Lazy-loads the Groq client only when the first chat request is processed."""
        if self._client is None:
            api_key = os.environ.get("GROQ_API_KEY")
            if api_key:
                from groq import Groq
                self._client = Groq(api_key=api_key)
        return self._client

    def generate_response(self, mode: str, message: str, context_data: dict, history: list) -> dict:
        if not self.client:
            return {
                "reply": "⚠️ Backend Error: GROQ_API_KEY environment variable is not set in your terminal session.",
                "citations": []
            }

        is_borrower = mode.lower() == "borrower"
        system_prompt = self.borrower_system_prompt if is_borrower else self.underwriter_system_prompt

        baseline = context_data.get("baseline", {}) if isinstance(context_data, dict) else {}
        simulated = context_data.get("simulated", {}) if isinstance(context_data, dict) else {}

        baseline_text = " | ".join([f"{k}: {v}" for k, v in baseline.items() if v is not None]) or "N/A"
        simulated_text = " | ".join([f"{k}: {v}" for k, v in simulated.items() if v is not None]) or "N/A"

        context_payload = (
            f"=== COMPLETE ORIGINAL BASELINE DATA ===\n{baseline_text}\n\n"
            f"=== ACTIVE WHAT-IF SIMULATION STATE ===\n{simulated_text}"
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
            from groq import GroqError, RateLimitError
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.3,
                max_completion_tokens=1024
            )
            reply_text = completion.choices[0].message.content
        except RateLimitError:
            reply_text = "⏳ **Rate Limit Reached**: You have hit the Groq API usage cap (requests or tokens per minute). Please wait a moment and try your request again."
        except GroqError as ge:
            reply_text = f"Groq API Error: {str(ge)}"
        except Exception as e:
            reply_text = f"Unexpected Error: {str(e)}"

        return {
            "reply": reply_text,
            "citations": ["Borrower Optimization Guide"] if is_borrower else ["Reg Z Ability-to-Repay", "LendScope Risk Engine"]
        }

chat_orchestrator = ChatOrchestrator()