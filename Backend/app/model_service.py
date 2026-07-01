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
    ) -> float:
        loan_percent_income = data.loan_amnt / data.person_income
        adjusted_probability = approval_probability

        # Hard caps. These keep obviously risky borrowers from being labeled excellent.
        if data.previous_loan_defaults_on_file == "Yes":
            adjusted_probability = min(adjusted_probability, 0.55)

        if data.credit_score < 580:
            adjusted_probability = min(adjusted_probability, 0.40)
        elif data.credit_score < 670:
            adjusted_probability = min(adjusted_probability, 0.70)

        if loan_percent_income >= 0.6:
            adjusted_probability = min(adjusted_probability, 0.25)
        elif loan_percent_income >= 0.4:
            adjusted_probability = min(adjusted_probability, 0.45)
        elif loan_percent_income >= 0.3:
            adjusted_probability = min(adjusted_probability, 0.70)

        if data.loan_int_rate >= 18:
            adjusted_probability = min(adjusted_probability, 0.45)
        elif data.loan_int_rate >= 15:
            adjusted_probability = min(adjusted_probability, 0.65)

        return max(0.0, min(1.0, adjusted_probability))

    def _get_risk_tier(self, approval_probability: float) -> str:
        if approval_probability >= 0.85:
            return "Tier 1 (Excellent Choice)"
        if approval_probability >= 0.65:
            return "Tier 2 (Moderate Risk)"
        if approval_probability >= 0.40:
            return "Tier 3 (High Risk)"
        return "Tier 4 (Likely Denial)"

    def predict_and_explain(self, data: LoanSimulationInput) -> dict:
        raw_df = self._prepare_input(data)

        # Calculate the model's approval probability and statistical probability of default
        #[[default prob, approval prob]]
        model_approval_probability = float(self.pipeline.predict_proba(raw_df)[0][1])
        statistical_pd = 1.0 - model_approval_probability

        adjusted_approval_probability = self._apply_underwriting_rules(
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
        raw_model_approval_probability = float(self.pipeline.predict_proba(raw_df)[0][1])  
        raw_model_prediction = int(self.pipeline.predict(raw_df)[0])

        return {
            "raw_model_approval_probability": raw_model_approval_probability,
            "raw_model_prediction": raw_model_prediction,
            "approval_probability": adjusted_approval_probability,
            "statistical_pd": statistical_pd,
            "risk_tier": self._get_risk_tier(adjusted_approval_probability),
            "policy_flags": self._get_policy_flags(data),
            "shap_values": shap_map,
        }

    
# Instantiate as a persistent singleton wrapper
model_service = ModelService()