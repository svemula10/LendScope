from pathlib import Path
from sys import flags
import joblib
import pandas as pd
import shap
from .schemas import LoanSimulationInput
import numpy as np

class ModelService:
    def __init__(self):
        #Get absolute path to backend folder
        base_dir = Path(__file__).resolve().parent.parent

        #All possible locations where the model might be stored
        model_candidates = [
            base_dir / "models" / "xgboost_model.joblib",
            base_dir / "app" / "models" / "xgboost_model.joblib",
            base_dir.parent / "ml" / "artifacts" / "xgboost_model.joblib",
        ]

        #Find the first existing model path from the candidates
        model_path = next((path for path in model_candidates if path.exists()), None)

        #If no model is found, raise an error with the checked paths
        if model_path is None:
            raise FileNotFoundError(
                "Could not find the trained model. Checked: "
                + ", ".join(str(path) for path in model_candidates)
            )

        #Load the model and its components
        self.pipeline = joblib.load(model_path)
        self.preprocessor = self.pipeline.named_steps["preprocessor"]
        self.classifier = self.pipeline.named_steps["classifier"]
        self.explainer = shap.TreeExplainer(self.classifier)

    def _prepare_input(self, data: LoanSimulationInput) -> pd.DataFrame:
        raw_df = pd.DataFrame([data.model_dump()])

        # Match the exact category casing used by the training data.
        raw_df["person_gender"] = raw_df["person_gender"].str.lower()
        raw_df["person_home_ownership"] = raw_df["person_home_ownership"].str.upper()
        raw_df["loan_intent"] = raw_df["loan_intent"].str.upper()

        # Dataset uses this engineered feature.
        raw_df["loan_percent_income"] = raw_df["loan_amnt"] / raw_df["person_income"]

        # Avoid extreme values outside the model's likely training range. The np.clip is the range of values allowed
        raw_df["loan_amnt"] = np.clip(raw_df["loan_amnt"], 500, 100000)
        raw_df["loan_percent_income"] = np.clip(raw_df["loan_percent_income"], 0.0, 2.0)
        raw_df["person_income"] = np.clip(raw_df["person_income"], 1000, 500000)
        raw_df["person_age"] = np.clip(raw_df["person_age"], 18, 100)

        if hasattr(self.pipeline, "feature_names_in_"):
            raw_df = raw_df[self.pipeline.feature_names_in_]

 
        return raw_df

    def _get_policy_flags(self, data: LoanSimulationInput) -> list[str]:
        flags = []

        loan_percent_income = data.loan_amnt / data.person_income

        if data.credit_score < 580:
            flags.append("Credit score is below the common subprime threshold of 580.")
        elif data.credit_score < 670:
            flags.append("Credit score is below the common good-credit threshold of 670.")

        if data.previous_loan_defaults_on_file == "Yes":
            flags.append("Previous loan default is on file.")

        if loan_percent_income >= 0.6:
            flags.append("Requested loan amount is at least 60% of annual income.")
        elif loan_percent_income >= 0.4:
            flags.append("Requested loan amount is at least 40% of annual income.")

        if data.person_income < 35000:
            flags.append("Annual income is relatively low for this requested loan amount.")

        if data.loan_int_rate >= 18:
            flags.append("Interest rate is very high and may make repayment difficult.")
        elif data.loan_int_rate >= 15:
            flags.append("Interest rate is high, which increases repayment burden.")

        return flags

    def _apply_underwriting_rules(
        self,
        approval_probability: float,
        data: LoanSimulationInput,
    ) -> tuple[float, dict]:
        """
        Applies business underwriting rules on top of the raw model approval probability.

        Strategy:
        - Hard caps for severe risk signals.
        - Combination caps for risky feature interactions.
        - Soft penalties for moderate risk signals.
        - Returns both adjusted probability and rule details for debugging/frontend display.
        """
    
        # Defensive guards
        income = max(float(data.person_income), 1.0)
        loan_amnt = max(float(data.loan_amnt), 0.0)
        loan_percent_income = loan_amnt / income

        credit_score = int(data.credit_score)
        previous_default = (
            str(data.previous_loan_defaults_on_file).strip().lower() == "yes"
        )
        home_ownership = str(data.person_home_ownership).strip().lower()
        loan_intent = str(data.loan_intent).strip().lower()

        adjusted_probability = float(approval_probability)

        caps: list[tuple[str, float]] = []
        penalties: list[tuple[str, float]] = []


        
        # -------------------------------------------------
        # 1. Hard caps: severe standalone risk signals
        # -------------------------------------------------

        if previous_default:
            if income > 100000:
                penalties.append(("previous_default_high_income_relief", 0.15))
            else:
                penalties.append(("previous_default_standard_impact", 0.35))

        if credit_score < 520:
            caps.append(("credit_score_below_520", 0.25))
        elif credit_score < 580:
            caps.append(("credit_score_below_580", 0.45))
        elif credit_score < 620:
            caps.append(("credit_score_below_620", 0.65))

        if loan_percent_income >= 0.80:
            caps.append(("loan_amount_at_least_80_percent_of_income", 0.20))
        elif loan_percent_income >= 0.60:
            caps.append(("loan_amount_at_least_60_percent_of_income", 0.35))

        # -------------------------------------------------
        # 2. Combination caps: riskier together than alone
        # -------------------------------------------------

        if previous_default and credit_score < 670:
            caps.append(("previous_default_and_credit_below_670", 0.35))

        if previous_default and loan_percent_income >= 0.40:
            caps.append(("previous_default_and_high_loan_to_income", 0.30))

        if previous_default and loan_percent_income >= 0.60:
            caps.append(("previous_default_and_very_high_loan_to_income", 0.20))

        if loan_percent_income >= 0.40 and credit_score < 580:
            caps.append(("high_loan_to_income_and_subprime_credit", 0.30))
        elif loan_percent_income >= 0.40 and credit_score < 670:
            caps.append(("high_loan_to_income_and_fair_credit", 0.45))
        elif loan_percent_income >= 0.40 and credit_score < 720:
            caps.append(("high_loan_to_income_and_good_credit", 0.60))

        if loan_percent_income >= 0.30 and credit_score < 620:
            caps.append(("moderate_loan_to_income_and_weak_credit", 0.50))

        if data.person_emp_exp < 1 and credit_score < 670:
            caps.append(("no_employment_experience_and_credit_below_670", 0.45))

        if data.cb_person_cred_hist_length < 2 and credit_score < 670:
            caps.append(("thin_credit_file_and_credit_below_670", 0.45))


        # -------------------------------------------------
        # 3. Soft penalties: moderate risk nudges
        # -------------------------------------------------

        if 670 <= credit_score < 700:
            penalties.append(("credit_score_near_prime", 0.03))
        elif 620 <= credit_score < 670:
            penalties.append(("fair_credit_score", 0.06))
        elif 580 <= credit_score < 620:
            penalties.append(("weak_credit_score", 0.09))

        if 0.50 <= loan_percent_income < 0.60:
            penalties.append(("loan_to_income_between_50_and_60_percent", 0.12))
        elif 0.40 <= loan_percent_income < 0.50:
            penalties.append(("loan_to_income_between_40_and_50_percent", 0.08))
        elif 0.30 <= loan_percent_income < 0.40:
            penalties.append(("loan_to_income_between_30_and_40_percent", 0.04))
        elif 0.20 <= loan_percent_income < 0.30:
            penalties.append(("loan_to_income_between_20_and_30_percent", 0.02))

        if data.person_income < 30000:
            penalties.append(("income_below_30000", 0.08))
        elif data.person_income < 40000:
            penalties.append(("income_below_40000", 0.05))
        elif data.person_income < 50000:
            penalties.append(("income_below_50000", 0.02))

        if data.person_emp_exp < 1:
            penalties.append(("less_than_1_year_employment_experience", 0.05))
        elif data.person_emp_exp < 2:
            penalties.append(("less_than_2_years_employment_experience", 0.03))
        elif data.person_emp_exp < 4:
            penalties.append(("less_than_4_years_employment_experience", 0.015))

        if data.cb_person_cred_hist_length < 2:
            penalties.append(("credit_history_less_than_2_years", 0.05))
        elif data.cb_person_cred_hist_length < 4:
            penalties.append(("credit_history_less_than_4_years", 0.03))
        elif data.cb_person_cred_hist_length < 6:
            penalties.append(("credit_history_less_than_6_years", 0.015))

        if home_ownership == "rent":
            penalties.append(("renter", 0.02))
        elif home_ownership == "other":
            penalties.append(("other_home_ownership", 0.03))

        if loan_intent in {"personal", "medical"}:
            penalties.append(("higher_risk_loan_intent", 0.02))
        elif loan_intent == "venture":
            penalties.append(("venture_loan_intent", 0.03))

        # Interest-rate penalty should be light if loan_int_rate is excluded from model training.
        # It still matters as affordability/business logic.
        if data.loan_int_rate >= 20:
            penalties.append(("interest_rate_at_least_20_percent", 0.10))
        elif data.loan_int_rate >= 18:
            penalties.append(("interest_rate_at_least_18_percent", 0.08))
        elif data.loan_int_rate >= 15:
            penalties.append(("interest_rate_at_least_15_percent", 0.05))


        # -------------------------------------------------
        # 4. Apply caps and penalties
        # -------------------------------------------------

        if caps:
            strictest_cap = min(cap_value for _, cap_value in caps)
            adjusted_probability = min(adjusted_probability, strictest_cap)

        total_penalty = sum(value for _, value in penalties)
        adjusted_probability = max(0.0, adjusted_probability - total_penalty)

        # -------------------------------------------------
        # 5. Give back small credit for genuinely strong compensating factors
        # -------------------------------------------------
        # This keeps decent applicants from being over-punished by one moderate weakness.
        # No boost is given if there are severe red flags.

        has_severe_red_flag = (
            previous_default
            or credit_score < 580
            or loan_percent_income >= 0.60
        )

        boosts: list[tuple[str, float]] = []

        if not has_severe_red_flag:
            if credit_score >= 740:
                boosts.append(("strong_credit_score", 0.04))
            elif credit_score >= 700:
                boosts.append(("good_credit_score", 0.025))

            if loan_percent_income < 0.15:
                boosts.append(("low_loan_to_income", 0.04))
            elif loan_percent_income < 0.25:
                boosts.append(("manageable_loan_to_income", 0.02))

            if data.person_income >= 100000:
                boosts.append(("high_income", 0.03))
            elif data.person_income >= 75000:
                boosts.append(("solid_income", 0.015))

            if data.person_emp_exp >= 8:
                boosts.append(("long_employment_experience", 0.02))

            if data.cb_person_cred_hist_length >= 8:
                boosts.append(("long_credit_history", 0.02))

            if home_ownership in {"own", "mortgage"}:
                boosts.append(("stable_home_ownership", 0.015))

        total_boost = sum(value for _, value in boosts)
        adjusted_probability = max(0.0, adjusted_probability + total_boost)

        # Final clamp
        adjusted_probability = max(0.0, min(1.0, adjusted_probability))

        policy_details = {
            "loan_percent_income": loan_percent_income,
            "caps_applied": caps,
            "penalties_applied": penalties,
            "boosts_applied": boosts,
            "total_penalty": total_penalty,
            "total_boost": total_boost,
            "raw_model_approval_probability": float(approval_probability),
            "policy_adjusted_approval_probability": adjusted_probability,
        }

        return adjusted_probability, policy_details


    def _get_risk_tier(self, approval_probability: float) -> str:
        if approval_probability >= 0.85:
            return "Tier 1 (Strong Approval)"
        if approval_probability >= 0.65:
            return "Tier 2 (Likely Approval)"
        if approval_probability >= 0.45:
            return "Tier 3 (Manual Review)"
        if approval_probability >= 0.25:
            return "Tier 4 (High Risk)"
        return "Tier 5 (Likely Denial)"


    def predict_and_explain(self, data: LoanSimulationInput) -> dict:
        raw_df = self._prepare_input(data)

        # Calculate the model's approval probability and statistical probability of default
        #[[default prob, approval prob]]
        statistical_pd = float(self.pipeline.predict_proba(raw_df)[0][1])
        model_approval_probability = 1.0 - statistical_pd

        adjusted_approval_probability, policy_details = self._apply_underwriting_rules(
            model_approval_probability,
            data,
        )

        transformed_features = self.preprocessor.transform(raw_df)
        feature_names = self.preprocessor.get_feature_names_out()

        #SHAP values are used to explain the model's predictions by attributing the contribution 
        #of each feature to the final prediction. 
        #The explainer computes these values based on the transformed features.
        shap_res = self.explainer.shap_values(transformed_features)
        local_weights = shap_res[0] if not isinstance(shap_res, list) else shap_res[0]

        shap_map = {
            name: float(weight)
            for name, weight in zip(feature_names, local_weights)
        }

        #For debugging purposes
        raw_model_approval_probability = 1 - float(self.pipeline.predict_proba(raw_df)[0][1])  
        raw_model_prediction = int(self.pipeline.predict(raw_df)[0])

        return {
            "raw_model_approval_probability": raw_model_approval_probability,
            "raw_model_prediction": raw_model_prediction,
            "approval_probability": adjusted_approval_probability,
            "statistical_pd": statistical_pd,
            "risk_tier": self._get_risk_tier(adjusted_approval_probability),
            "policy_flags": self._get_policy_flags(data),
            "policy_details": policy_details,
            "shap_values": shap_map,
        }

    
# Instantiate as a persistent singleton wrapper
model_service = ModelService()