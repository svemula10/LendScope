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

    def execute_underwriting_audit(self, loan_data: dict, mode: str = "underwriter") -> dict:
        credit_score = int(loan_data.get("credit_score", 0))
        annual_income = float(loan_data.get("person_income", 1))
        loan_amount = float(loan_data.get("loan_amnt", 0))
        interest_rate = float(loan_data.get("loan_int_rate", 0))
        defaults_count = loan_data.get("previous_loan_defaults_on_file", "n").lower()

        ml_probability_raw = loan_data.get("ml_probability")
        ml_risk_tier_raw = loan_data.get("ml_risk_tier")

        # Compute DTI
        monthly_rate = (interest_rate / 100) / 12
        if loan_amount > 0 and monthly_rate > 0:
            monthly_payment = (loan_amount * monthly_rate * ((1 + monthly_rate)**36)) / (((1 + monthly_rate)**36) - 1)
        else:
            monthly_payment = loan_amount / 36

        monthly_income = annual_income / 12
        computed_dti = (monthly_payment / monthly_income) * 100 if monthly_income > 0 else 0

        # Dynamic fallback parameters
        if ml_probability_raw is None or ml_risk_tier_raw is None:
            if credit_score < 620 or computed_dti > 45 or defaults_count in ["y", "yes"]:
                ml_probability = 0.15
                ml_risk_tier = "CRITICAL"
            elif credit_score < 680 or computed_dti > 38:
                ml_probability = 0.58
                ml_risk_tier = "HIGH"
            elif credit_score < 720 or computed_dti > 30:
                ml_probability = 0.76
                ml_risk_tier = "MEDIUM"
            else:
                ml_probability = 0.94
                ml_risk_tier = "LOW"
        else:
            ml_probability = float(ml_probability_raw)
            ml_risk_tier = str(ml_risk_tier_raw).upper()

        rules_scorecard = []
        violations_list = []

        # ========================================================
        # 📂 DYNAMIC POLICY SCORECARD CONSOLE LOOP
        # ========================================================

        # --- Rule 1: Credit Score Matrix ---
        score_passed = credit_score >= 620
        if not score_passed: 
            violations_list.append(f"• Credit score baseline criteria broken (Current: {credit_score} / Target: 620+).")
        
        credit_title = "Minimum Representative Credit" if mode == "underwriter" else "Your Credit Score Health"
        credit_summary = (
            "SUMMARY OF SECTION B3-5.1-01: This section establishes the minimum representative credit score "
            "standards required for traditional conventional fixed-rate and adjustable-rate mortgages (ARMs). "
            "It outlines the operational framework for identifying the representative score across multiple credit "
            "bureaus, setting a mandatory absolute baseline minimum score of 620 for low-variance manual "
            "underwriting paths. Profiles falling below this limit are disqualified from automated safe-harbor "
            "allocations unless specialized community secondary lending exceptions apply."
        )

        rules_scorecard.append({
            "rule_id": "policy_credit_min",
            "name": credit_title,
            "evaluated_metric": f"Score: {credit_score}",
            "required_ceiling": "Required Baseline: ≥ 620",
            "status": "PASS" if score_passed else "VIOLATION",
            "summary_citation": "SECTION B3-5.1-01: Enforces a minimum credit score baseline of 620 for manual fixed-rate deliveries.",
            "full_text_citation": credit_summary
        })

        # --- Rule 2: Debt-to-Income Framework ---
        dti_passed = computed_dti <= 45.0
        if not dti_passed: 
            violations_list.append(f"• Total Debt-to-Income profile is out-of-bounds (Current: {computed_dti:.1f}% / Cap: 45.0%).")

        dti_title = "Debt-to-Income Framework Boundary" if mode == "underwriter" else "Monthly Debt Footprint Check"
        dti_summary = (
            "SUMMARY OF SECTION B3-6-02: This section defines the calculations, requirements, and risk boundaries "
            "governing a borrower's total monthly Debt-to-Income (DTI) ratio. It establishes a rigid structural ceiling "
            "of 45.0% for conventional underwriting deliveries. The text covers mandatory inclusion rules for revolving "
            "debts, installment obligations, and housing liabilities, while noting that variances up to 50% are strictly "
            "restricted to high-liquidity applicants backed by extensive asset reserve balances or automated Desktop "
            "Underwriter (DU) approvals."
        )

        rules_scorecard.append({
            "rule_id": "policy_dti_ceiling",
            "name": dti_title,
            "evaluated_metric": f"Calculated DTI: {computed_dti:.1f}%",
            "required_ceiling": "Required Baseline: ≤ 45.0%",
            "status": "PASS" if dti_passed else "VIOLATION",
            "summary_citation": "SECTION B3-6-02: Restricts standard manual underwriting configurations to a maximum DTI cap of 45.0%.",
            "full_text_citation": dti_summary
        })

        # --- Rule 3: Derogatory Delinquency History ---
        defaults_passed = (defaults_count in ["n", "no"])
        if not defaults_passed: 
            violations_list.append("• Credit profile summary contains severely historical default marks.")

        defaults_title = "Derogatory Default Review" if mode == "underwriter" else "Prior Credit History Background"
        defaults_summary = (
            "SUMMARY OF SECTION B3-5.3-07: This section delineates the treatment of significant derogatory credit "
            "events, including prior foreclosures, bankruptcies, and outstanding repository loan defaults on active "
            "files. It enforces mandatory waiting-period sequences (typically 2 to 7 years depending on termination type) "
            "and requires comprehensive billing re-establishment trails. Outstanding un-extinguished defaults or "
            "active delinquencies compromise structural assignment loops, requiring immediate manual intervention or "
            "unconditional termination."
        )

        rules_scorecard.append({
            "rule_id": "policy_derogatory_events",
            "name": defaults_title,
            "evaluated_metric": f"Defaults Flag: '{defaults_count.upper()}'",
            "required_ceiling": "Required Baseline: No defaults",
            "status": "PASS" if defaults_passed else "VIOLATION",
            "summary_citation": "SECTION B3-5.3-07: Outstanding defaults compromise clean conventional loan assignment loops.",
            "full_text_citation": defaults_summary
        })

        # ========================================================
        # RECONCILED TIERED RECOMMENDATION SYSTEM
        # ========================================================
        has_policy_violations = len(violations_list) > 0
        violations_block = "\n".join(violations_list)

        if ml_risk_tier == "CRITICAL" or ml_probability < 0.40:
            rec_status = "CRITICAL"
            if mode == "underwriter":
                rec_header = "High-Risk Portfolio Denial Notice"
                rec_body = f"Application rejected due to explicit policy criteria failures. Underwriting loops halted. Approval odds sit at {ml_probability*100:.0f}%.\n\nPolicy Breaches:\n{violations_block if has_policy_violations else '• Profile parameters demonstrate elevated default correlation flags.'}"
            else:
                rec_header = "Action Required to Stabilize Your Profile"
                rec_body = f"Your profile doesn't clear the baseline conventional guidelines yet (Current Odds: {ml_probability*100:.0f}%). Let's fix the root obstacles first:\n\nObstacle Items:\n{violations_block if has_policy_violations else '• Your loan amount request is too high compared to your reported income framework.'}"

        elif ml_risk_tier == "HIGH" or (0.40 <= ml_probability < 0.70):
            rec_status = "CRITICAL"
            if mode == "underwriter":
                rec_header = "Manual Credit Committee Audit Required"
                rec_body = f"Application placed in high-risk baseline bracket (Approval Odds: {ml_probability*100:.0f}%). Automated agency allocation blocked. Requires manual documentation overlay checks to clear portfolio assignment."
            else:
                rec_header = "Moderate Risk - Roadmap to Success"
                rec_body = f"You are close to safe territory, but your current setup puts you in a cautious bracket (Approval Odds: {ml_probability*100:.0f}%). Try these minor slider adjustments to build a safer profile:\n\n• Adjust the requested loan amount slider down or income slider up to improve your probability.\n• Boost your simulated credit score to move into a stronger risk tier."

        elif ml_risk_tier == "MEDIUM" or has_policy_violations:
            rec_status = "CRITICAL" if has_policy_violations else "SUCCESS"
            if mode == "underwriter":
                rec_header = "Conditional Variance Pre-Approval"
                rec_body = f"Application metrics are within manageable limits (Approval Odds: {ml_probability*100:.0f}%). Eligible for routing subject to verifying trailing reserve accounts.\n\nPending Actions:\n{violations_block if has_policy_violations else '• Request explicit tax transcripts and secondary asset tracking statements.'}"
            else:
                rec_header = "Conditional Pre-Approval Readiness"
                rec_body = f"Good progress! Your file shows minor policy exceptions, but your overall approval probability is solid at {ml_probability*100:.0f}%.\n\nNext Steps:\n{violations_block if has_policy_violations else '• Gathering alternative credit references, like solid rental history logs, will make this profile significantly stronger.'}"

        else:
            rec_status = "SUCCESS"
            if mode == "underwriter":
                rec_header = "Automated Agency Pass Approved"
                rec_body = f"Premium eligibility asset match (Approval Probability: {ml_probability*100:.0f}%, Risk Profile: LOW). Fully compliant with handbook fixed-rate constraints. Recommended for standard portfolio delivery."
            else:
                rec_header = "Excellent Profile🎉"
                rec_body = f"Excellent! Your requested loan metrics, debt footprint ({computed_dti:.1f}%), and credit score place you in our top lending tier (Approval Odds: {ml_probability*100:.0f}%). Lenders prefer files matching this exact profile description."

        return {
            "policy_guidelines": rules_scorecard,
            "recommendation_summary": {
                "header": rec_header,
                "body": rec_body,
                "status": rec_status
            }
        }

compliance_audit_service = ComplianceAuditService()