from pathlib import Path
import joblib
import pandas as pd
import shap
from .schemas import LoanSimulationInput

class ModelService:
    def __init__(self):
        # Locate and load the serialized pipeline cleanly
        base_dir = Path(__file__).resolve().parent()
        model_path = base_dir / "models" / "xgboost_model.joblib"

        # Load the serialized pipeline
        self.pipeline = joblib.load(model_path)

        # Unpack components for SHAP explainer
        self.preprocessor = self.pipeline.named_steps['preprocessor']
        self.classifier = self.pipeline.named_steps['classifier']
        
        # Build TreeExplainer directly on top of the underlying trained tree
        self.explainer = shap.TreeExplainer(self.classifier)
        
        def predict_and_explain(self, data: LoanSimulationInput) -> dict:
            # Convert incoming JSON schema cleanly to a DataFrame row
            raw_df = pd.DataFrame([data.model_dump()])
            
            # 1. Compute baseline probability
            prob_default = float(self.pipeline.predict_proba(raw_df)[0][1])
            approval_prob = 1.0 - prob_default
            
            # Assign dynamic Tier categories
            if approval_prob >= 0.85:
                tier = "Tier 1 (Excellent Choice)"
            elif approval_prob >= 0.70:
                tier = "Tier 2 (Moderate Risk)"
            else:
                tier = "Tier 3 (High Risk Deficient)"

            # 2. Extract SHAP values
            # Transform raw features to their post-preprocessed state matching the classifier matrix
            transformed_features = self.preprocessor.transform(raw_df)
            feature_names = self.preprocessor.get_feature_names_out()
            
            shap_res = self.explainer.shap_values(transformed_features)
            
            # Map raw feature weights back into a readable dictionary for our frontend charts
            # Note: Handle shape variations depending on exact library setups
            local_weights = shap_res[0] if isinstance(shap_res, list) else shap_res[0]
            
            shap_map = {name: float(weight) for name, weight in zip(feature_names, local_weights)}

            return {
                "approval_probability": approval_prob,
                "risk_tier": tier,
                "shap_values": shap_map
            }

# Instantiate as a persistent singleton wrapper
model_service = ModelService()