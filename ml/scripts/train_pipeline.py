import os
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
import joblib

def load_and_clean_data(data_path: str) -> pd.DataFrame:
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    
    # Address the data issue mentioned in the briefing
    # Remove ridiculous age outliers (e.g., > 100) and impossible employment lengths
    initial_count = len(df)
    df = df[df['person_age'] < 100]
    df = df[df['person_emp_exp'] < 60]  # No one works for 60+ years if max age is under 100
    
    df["loan_percent_income"] = df["loan_amnt"] / df["person_income"]

    #df["previous_default_flag"] = df["previous_loan_defaults_on_file"].map({
    #    "No": 0,
     #   "Yes": 1,
    #})

    #df = df.drop(columns=["previous_loan_defaults_on_file"])


    print(f"Cleaned outliers. Removed {initial_count - len(df)} anomalous rows.")
    return df

#def build_monotone_constraints(numeric_cols, categorical_cols, X_train):
    numeric_constraints = {
        #"person_income": 1,
        #"person_emp_exp": 1,
        #"loan_amnt": -1,
        "loan_int_rate": -1,
        "loan_percent_income": -1,
        #"cb_person_cred_hist_length": 1,
        "credit_score": 1,
        #"previous_default_flag": -1,
    }

    constraints = []

    for col in numeric_cols:
        constraints.append(numeric_constraints.get(col, 0))

    # One-hot categorical columns should usually have no monotonic constraint.
    for col in categorical_cols:
        constraints.extend([0] * X_train[col].nunique())

    return tuple(constraints)


def build_pipeline(categorical_cols, numeric_cols): #, monotone_constraints
    # Preprocessing for numerical data: Impute missing (if any) and scale
    numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='mean')),
            ('scaler', StandardScaler())
        ])

    # Preprocessing for categorical data: One-hot encode strings
    categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='most_frequent')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

    # Combine preprocessing steps
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_cols),
            ('cat', categorical_transformer, categorical_cols)
        ])


    # Append classifier to preprocessing pipeline
    full_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(
            n_estimators=200,
            max_depth=6,              # Lower depth prevents single-feature dominance (e.g., No Defaults)
            learning_rate=0.05,
            min_child_weight=5,       # Prevents overfitting on highly specific outlier profiles
            subsample=0.8,
            colsample_bytree=0.8,
            #scale_pos_weight=4.0,     # Penalizes missing a true defaulter (adjust based on your 0 vs 1 ratio)###
            random_state=42,
            #monotone_constraints = monotone_constraints,
            eval_metric='logloss'    
        ))
    ])
    return full_pipeline


def main():
    # Define paths
    script_dir = Path(__file__).resolve().parent

    DATA_PATH = script_dir.parent / "data" / "loan_data.csv"
    ARTIFACT_DIR = script_dir.parent / "artifacts"
    
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model_output_path = ARTIFACT_DIR / "xgboost_model.joblib"

    # 1. Load and clean
    try:
        df = load_and_clean_data(DATA_PATH)
    except FileNotFoundError:
        print(f"Error: Could not find dataset at {DATA_PATH}. Please place your CSV there.")
        return

    # 2. Identify target and features
    #target = 'loan_status'
    #X = df.drop(columns=[target])
    #y = df[target]

    target = "loan_status"

    approval_model_excluded_cols = [
        target,
        "loan_int_rate",
    ]

    X = df.drop(columns=approval_model_excluded_cols)
    y = df[target]


    # Explicitly separate column types
    categorical_cols = X.select_dtypes(include=['str', 'object', 'category']).columns.tolist()
    numeric_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

    print(f"Features found:\n 🔹 Numeric: {numeric_cols}\n 🔹 Categorical: {categorical_cols}")

    # 3. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)


    #monotone_constraints = build_monotone_constraints(
    #numeric_cols,
    #categorical_cols,
    #X_train,
    #)

    # 4. Construct and train full pipeline
    pipeline = build_pipeline(categorical_cols, numeric_cols) #, monotone_constraints)
    print("Training XGBoost Classifier within Scikit-Learn Pipeline...")
    pipeline.fit(X_train, y_train)

    # 5. Evaluate Model performance
    train_acc = pipeline.score(X_train, y_train)
    test_acc = pipeline.score(X_test, y_test)
    print(f"Training Complete!\n Train Accuracy: {train_acc*100:.2f}%\n Test Accuracy: {test_acc*100:.2f}%")

    # 6. Save the artifact
    joblib.dump(pipeline, model_output_path)
    print(f" Pipeline successfully serialized and saved to: {model_output_path}")

if __name__ == "__main__":
    main()