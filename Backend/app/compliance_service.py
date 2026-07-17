# backend/app/compliance_service.py
import os
import chromadb
from chromadb.utils import embedding_functions

class ComplianceAuditService:
    def __init__(self):
        db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
        self.client = chromadb.PersistentClient(path=db_path)
        self.embedding_model = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self.collection = self.client.get_or_create_collection(
            name="fannie_mae_compliance",
            embedding_function=self.embedding_model
        )

    def _query_rag_policy(self, conceptual_phrase: str, topic_filter: str) -> str:
        try:
            results = self.collection.query(
                query_texts=[conceptual_phrase],
                where={"topic": topic_filter},
                n_results=1
            )
            if results and results["documents"] and results["documents"][0]:
                return results["documents"][0][0]
        except Exception:
            pass
        return "Reference guideline section paragraph currently unavailable."

    def execute_underwriting_audit(self, loan_data: dict, mode: str = "underwriter") -> dict:
        credit_score = int(loan_data.get("credit_score", 0))
        annual_income = float(loan_data.get("person_income", 1))
        loan_amount = float(loan_data.get("loan_amnt", 0))
        interest_rate = float(loan_data.get("loan_int_rate", 0))
        defaults_count = loan_data.get("previous_loan_defaults_on_file", "n").lower()

        # Compute Front-End DTI ratio (standard 36-month tracking loan layout)
        monthly_rate = (interest_rate / 100) / 12
        if loan_amount > 0 and monthly_rate > 0:
            monthly_payment = (loan_amount * monthly_rate * ((1 + monthly_rate)**36)) / (((1 + monthly_rate)**36) - 1)
        else:
            monthly_payment = loan_amount / 36

        monthly_income = annual_income / 12
        computed_dti = (monthly_payment / monthly_income) * 100 if monthly_income > 0 else 0

        rules_scorecard = []
        violations_list = []

        # --- Check 1: Representative Credit Score Rule ---
        score_citation = self._query_rag_policy("What are the minimum credit score requirements?", "credit")
        score_passed = credit_score >= 620
        if not score_passed:
            violations_list.append("credit")
            
        rules_scorecard.append({
            "rule_id": "policy_credit_min",
            "name": "Minimum Representative Credit" if mode == "underwriter" else "Credit Health Safe Harbor Check",
            "evaluated_metric": f"Score: {credit_score}",
            "required_ceiling": "Required Baseline: ≥ 620",
            "status": "PASS" if score_passed else "VIOLATION",
            "citation": score_citation
        })

        # --- Check 2: Debt-to-Income Ceilings ---
        dti_citation = self._query_rag_policy("What is the maximum debt to income ratio DTI limit?", "dti")
        dti_passed = computed_dti <= 45.0
        if not dti_passed:
            violations_list.append("dti")

        rules_scorecard.append({
            "rule_id": "policy_dti_ceiling",
            "name": "Debt-to-Income Framework Boundary" if mode == "underwriter" else "Monthly Budget Load Check",
            "evaluated_metric": f"Computed DTI: {computed_dti:.1f}%",
            "required_ceiling": "Required Baseline: ≤ 45.0%",
            "status": "PASS" if dti_passed else "VIOLATION",
            "citation": dti_citation
        })

        # --- Check 3: Prior Historical Defaults ---
        default_citation = self._query_rag_policy("What happens if there are default records on file?", "credit")
        defaults_passed = (defaults_count in ["n", "no"])
        if not defaults_passed:
            violations_list.append("defaults")

        rules_scorecard.append({
            "rule_id": "policy_derogatory_events",
            "name": "Derogatory Default Review" if mode == "underwriter" else "Prior Credit History Check",
            "evaluated_metric": f"Defaults Flag: '{defaults_count.upper()}'",
            "required_ceiling": "Required Baseline: No defaults",
            "status": "PASS" if defaults_passed else "VIOLATION",
            "citation": default_citation
        })

        # --- persona aware dynamic compilation engine logic ---
        is_fully_compliant = (score_passed and dti_passed and defaults_passed)
        
        if is_fully_compliant:
            if mode == "underwriter":
                recommendation_header = "Recommended for Standard Portfolio Delivery"
                recommendation_body = f"Application metrics align perfectly with conventional manual underwriting guidelines. Representative credit score ({credit_score}) meets baseline limits, and calculated DTI ({computed_dti:.1f}%) clears delivery parameters."
            else:
                recommendation_header = "Your Loan Profile is Looking Strong!"
                recommendation_body = f"Great work! Your financial snapshot meets the major criteria guidelines lenders look for. Your credit file and monthly debt balance ({computed_dti:.1f}%) are inside stable, safe zones. You are in a fantastic position to move forward."
            recommendation_status = "SUCCESS"
        else:
            if mode == "underwriter":
                recommendation_header = "Institutional Policy Variance Rejection Notice"
                reasons = []
                if "credit" in violations_list: reasons.append(f"Credit score ({credit_score}) violates structural baseline threshold definitions")
                if "dti" in violations_list: reasons.append(f"Computed debt burden obligations ({computed_dti:.1f}%) exceed manual clearing ceilings")
                if "defaults" in violations_list: reasons.append("Active summary repository file contains severe historical default records")
                
                recommendation_body = "Automated compliance evaluation halted. The transaction package violates direct institutional underwriting parameters:\n\n" + "\n".join([f"• {r}" for rreasons in reasons for r in [rreasons]])
            else:
                recommendation_header = "Action Steps to Improve Your Loan Readiness"
                reasons = []
                if "credit" in violations_list: reasons.append(f"• Your credit score of {credit_score} is currently below the standard target of 620. Consider monitoring balance utilizations to boost your score trajectory.")
                if "dti" in violations_list: reasons.append(f"• Your estimated monthly loan payments take up {computed_dti:.1f}% of your gross income, exceeding the 45% safety bound. Try reducing your requested loan amount or adjusting the term tracking slider down.")
                if "defaults" in violations_list: reasons.append("• Prior unverified repayment indicators were flagged on your report file. Gathering alternative billing records (like stable rental or utility histories) can help prove your readiness history to lenders.")
                
                recommendation_body = "We noticed some factors are holding back your readiness scorecard. Here is your clear, plain-English roadmap to optimize your profile before formally applying:\n\n" + "\n".join(reasons)
            recommendation_status = "CRITICAL"

        return {
            "policy_guidelines": rules_scorecard,
            "recommendation_summary": {
                "header": recommendation_header,
                "body": recommendation_body,
                "status": recommendation_status
            }
        }

compliance_audit_service = ComplianceAuditService()