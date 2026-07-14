import re
from typing import Optional
from app.schemas import DocumentExtractionResponse

class DocumentService:
    @staticmethod
    async def extract_fields_from_text(text: str) -> DocumentExtractionResponse:
        applicant_name: Optional[str] = None
        person_age: Optional[int] = None
        person_income: Optional[int] = None
        person_emp_exp: Optional[int] = None
        person_education: Optional[str] = None 
        person_gender: Optional[str] = None    
        person_home_ownership: Optional[str] = None
        loan_amnt: Optional[int] = None
        loan_int_rate: Optional[float] = None
        loan_intent: Optional[str] = None
        credit_score: Optional[int] = None
        cb_person_cred_hist_length: Optional[int] = None
        previous_loan_defaults_on_file: Optional[str] = None

        # 1. Regex Compile Patterns
        name_patterns = [r"(?:name|applicant|employee)\s*:\s*([A-Za-z\s\.\-\,]+)", r"borrower\s+([A-Za-z\s]+)"]
        income_patterns = [r"(?:annual|gross|base|total)\s*(?:income|salary|earnings)\s*(?:\:\s*|\=\s*)?\$?\s*([0-9\.\,]+)"]
        score_patterns = [r"(?:credit\s+score|fico|bureau\s+rating)\s*:\s*([0-9]{3})", r"score\s*:\s*([0-9]{3})"]
        loan_patterns = [r"(?:loan\s+amount|requested|principal)\s*:\s*\$?\s*([0-9\.\,]+)"]
        rate_patterns = [r"(?:interest\s+rate|apr|coupon)\s*:\s*([0-9\.]+)\s*\%?"]
        exp_patterns = [r"(?:employment|experience|job\s+length|tenure)\s*:\s*([0-9]+)"]
        hist_patterns = [r"(?:history\s+length|credit\s+history|file\s+age)\s*:\s*([0-9]+)"]
        
        # Age Pattern Mapping
        age_patterns = [r"\b(?:age)\s*:\s*([0-9]{2})\b", r"\bbirth\s*date\s*age\s*:\s*([0-9]{2})\b"]

        def clean_int(val: str) -> Optional[int]:
            try:
                cleaned = re.sub(r'[^\d]', '', val.split('.')[0])
                return int(cleaned) if cleaned else None
            except ValueError:
                return None

        # 2. Sequential Line Analysis Loop
        lines = text.splitlines()
        for line in lines:
            line_str = line.strip()
            
            if not applicant_name:
                for p in name_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: applicant_name = m.group(1).strip(); break

            if not person_income:
                for p in income_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: person_income = clean_int(m.group(1)); break

            if not credit_score:
                for p in score_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: credit_score = clean_int(m.group(1)); break

            if not loan_amnt:
                for p in loan_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: loan_amnt = clean_int(m.group(1)); break

            if not loan_int_rate:
                for p in rate_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        try: loan_int_rate = float(m.group(1))
                        except ValueError: pass
                        break

            if not person_emp_exp:
                for p in exp_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: person_emp_exp = clean_int(m.group(1)); break

            if not cb_person_cred_hist_length:
                for p in hist_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: cb_person_cred_hist_length = clean_int(m.group(1)); break

            # Age Extraction Parser Logic
            if not person_age:
                for p in age_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m: person_age = clean_int(m.group(1)); break

            # Categorical Keyword Mapping for Education Options
            if not person_education:
                # Looks for any line mentioning education or degree, or standalone graduation terms
                if re.search(r'education|degree|level', line_str, re.IGNORECASE):
                    if re.search(r'bachelor|undergrad|college|university', line_str, re.IGNORECASE):
                        person_education = "Bachelor" # Maps to your exact form dropdown value
                    elif re.search(r'master|mba|grad', line_str, re.IGNORECASE):
                        person_education = "Master"
                    elif re.search(r'high\s*school|ged|secondary', line_str, re.IGNORECASE):
                        person_education = "High School"
                    elif re.search(r'Associate', line_str, re.IGNORECASE):
                        person_education = "Associate"
                    elif re.search(r'doctorate', line_str, re.IGNORECASE):
                        person_education = "Doctorate"

            # Categorical Keyword Mapping for Gender Fields
            if not person_gender:
                if re.search(r'gender|sex', line_str, re.IGNORECASE):
                    if re.search(r'\bfemale\b|\bf\b', line_str, re.IGNORECASE):
                        person_gender = "Female"
                    elif re.search(r'\bmale\b|\bm\b', line_str, re.IGNORECASE):
                        person_gender = "Male"

            # Remaining Form Logic
            if not person_home_ownership:
                if re.search(r'\brent\b', line_str, re.IGNORECASE): person_home_ownership = "Rent"
                elif re.search(r'\bmortgage\b', line_str, re.IGNORECASE): person_home_ownership = "Mortgage"
                elif re.search(r'\bown\b', line_str, re.IGNORECASE): person_home_ownership = "Own"
                elif re.search(r'\bother\b', line_str, re.IGNORECASE): person_home_ownership = "Other"

            if not loan_intent:
                for purpose in ["personal", "education", "medical", "venture", "homeimprovement", "debtconsolidation"]:
                    if re.search(rf'\b{purpose}\b', line_str, re.IGNORECASE): loan_intent = purpose; break

            if not previous_loan_defaults_on_file:
                if re.search(r'(?:prior|previous|historical)\s+default\s*:\s*(?:yes|y)', line_str, re.IGNORECASE): previous_loan_defaults_on_file = "Yes"
                elif re.search(r'(?:prior|previous|historical)\s+default\s*:\s*(?:no|n)', line_str, re.IGNORECASE): previous_loan_defaults_on_file = "No"

        return DocumentExtractionResponse(
            applicant_name=applicant_name,
            person_age=person_age,
            person_income=person_income,
            person_emp_exp=person_emp_exp,
            person_education=person_education,
            person_gender=person_gender,
            person_home_ownership=person_home_ownership,
            loan_amnt=loan_amnt,
            loan_int_rate=loan_int_rate,
            loan_intent=loan_intent,
            credit_score=credit_score,
            cb_person_cred_hist_length=cb_person_cred_hist_length,
            previous_loan_defaults_on_file=previous_loan_defaults_on_file
        )