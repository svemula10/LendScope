import re
import fitz as pymupdf
from app.schemas import DocumentExtractionResponse

class DocumentService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
        extracted_text = ""
        lower_name = filename.lower()

        # Bypassed image OCR parsing to eliminate heavy Tesseract memory bloat on cloud hosts
        if any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            print("⚠️ Image OCR parsing is disabled in cloud deployment mode.")
            return "Image uploads require local OCR binaries. Please upload a PDF or text document."

        elif lower_name.endswith(".pdf"):
            try:
                doc = pymupdf.open(stream=file_bytes, filetype="pdf")
                for page in doc:
                    text = page.get_text()
                    extracted_text += text + "\n"
            except Exception as e:
                print(f"PDF structure failure: {e}")
            return extracted_text

        elif lower_name.endswith(".txt"):
            return file_bytes.decode("utf-8", errors="ignore")
        
        return extracted_text

    @classmethod
    async def extract_fields_from_text(cls, text: str) -> DocumentExtractionResponse:
        # ✅ Fixed for Pydantic V2: replaced `__fields__` with `model_fields`
        data = {field: None for field in DocumentExtractionResponse.model_fields.keys()}
        if not text.strip():
            return DocumentExtractionResponse(**data)

        # --- Clean Line Splits Utility ---
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # ==========================================
        # 1. APPLICANT NAME EXTRACTION
        # ==========================================
        name_match = re.search(r"(?:Applicant\s+Name|Names?\s+Reported|Employee\s+Name|Customer\s+Name|Name|1|2|LN|FN)\s*:?\s*([A-Za-z\s\.\,\-]+)", text, re.IGNORECASE)
        if name_match:
            potential_name = name_match.group(1).split("\n")[0].strip()
            potential_name = re.sub(r"\b(?:Date|DOB|Birth|Age|Income|SSN|Address|Telephone|Phone)\b.*$", "", potential_name, flags=re.IGNORECASE).strip()
            if "," in potential_name:
                parts = [p.strip() for p in potential_name.split(",")]
                potential_name = " ".join(parts[::-1])
            if potential_name and len(potential_name.split()) >= 2:
                data["applicant_name"] = potential_name.title()

        # ==========================================
        # 2. AGE / DOB EXTRACTION
        # ==========================================
        age_match = re.search(r"\b(?:Age|Current\s+Age)\s*[:|-]?\s*(\d{2,3})\b", text, re.IGNORECASE)
        if age_match:
            data["person_age"] = int(age_match.group(1))
        else:
            raw_date_str = ""
            
            # --- TIER 1: Strict Adjacent Label Search ---
            dob_adjacent = re.search(r"(?:DOB|Birth|Date\s+of\s+Birth|DateOfBirth|BirthDate)[\s*:|\.\,-]*\s*([A-Za-z0-9\s\-\/\,]{6,50})", text, re.IGNORECASE)
            if dob_adjacent:
                raw_date_str = dob_adjacent.group(1).split("\n")[0].strip()

            # --- TIER 2: Proximity Character Window Scan ---
            if not raw_date_str or len(re.findall(r"\d", raw_date_str)) < 2:
                dob_label_match = re.search(r"(?:DOB|Birth|Date\s+of\s+Birth|DateOfBirth|BirthDate)", text, re.IGNORECASE)
                if dob_label_match:
                    start_idx = dob_label_match.end()
                    window = text[start_idx : start_idx + 40]
                    date_bubble = re.search(r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\,\s+\d{4})", window, re.IGNORECASE)
                    if date_bubble:
                        raw_date_str = date_bubble.group(0)

            # --- TIER 3: Global Sequential Date Scan Fallback ---
            if not raw_date_str:
                for line in lines[:15]:
                    if re.search(r"\b(EXP|ISS|Expires|Issued|4a|4b|Date\s+Reported|Hired)\b", line, re.IGNORECASE):
                        continue
                    date_match = re.search(r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\,\s+\d{4})", line, re.IGNORECASE)
                    if date_match:
                        raw_date_str = date_match.group(0)
                        break

            # --- PRECISE UNIVERSAL DATE PARSING ---
            if raw_date_str:
                raw_date_str = raw_date_str.replace('O', '0').replace('o', '0').strip()
                four_digit_year_match = re.search(r"\b(19\d{2}|20[0-2]\d)\b", raw_date_str)
                
                if four_digit_year_match:
                    birth_year = int(four_digit_year_match.group(1))
                    data["person_age"] = 2026 - birth_year
                else:
                    clean_numeric_match = re.search(r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b", raw_date_str)
                    if clean_numeric_match:
                        year_chunk = clean_numeric_match.group(3)
                        birth_year = int(year_chunk)
                        birth_year += 2000 if birth_year <= 26 else 1900
                        data["person_age"] = 2026 - birth_year

        # ==========================================
        # 3. FINANCIAL NUMERICS (INCOME & LOAN AMNT)
        # ==========================================
        income_match = re.search(r"(?:Annual\s+Income|Gross\s+Pay|Income|Salary)\s*:?\s*\$?([0-9,]+)", text, re.IGNORECASE)
        if income_match:
            val = int(income_match.group(1).replace(",", ""))
            data["person_income"] = val * 12 if val < 10000 else val

        loan_match = re.search(r"(?:Requested\s+Loan\s+Amount|Loan\s+Amount|Amount\s+Requested|Principal)\s*:?\s*\$?([0-9,]+)", text, re.IGNORECASE)
        if loan_match:
            data["loan_amnt"] = int(loan_match.group(1).replace(",", ""))

        # ==========================================
        # 4. CREDIT DATA VARIABLES
        # ==========================================
        score_match = re.search(r"(?:Credit\s+Score|FICO|VantageScore)\s*:?\s*(\d{3})", text, re.IGNORECASE)
        if score_match:
            data["credit_score"] = int(score_match.group(1))

        rate_match = re.search(r"(?:Interest\s+Rate|Int\s+Rate|Rate|APR)\s*:?\s*([0-9.]+)\s*\%?", text, re.IGNORECASE)
        if rate_match:
            data["loan_int_rate"] = float(rate_match.group(1))

        if re.search(r"\b(?:EXP)\b\s*:\s*[\d]{2}", text, re.IGNORECASE):
            exp_match = re.search(r"(?:Employment\s+Experience|Work\s+History|Years\s+of\s+Experience)\s*:?\s*(\d+)", text, re.IGNORECASE)
        else:
            exp_match = re.search(r"(?:Employment\s+Experience|Work\s+History|Years\s+of\s+Exp|\bExp\b)\s*:?\s*(\d+)", text, re.IGNORECASE)
        
        if exp_match:
            data["person_emp_exp"] = int(exp_match.group(1))

        hist_match = re.search(r"(?:Credit\s+History\s+Length|History\s+Length|Credit\s+Age)\s*:?\s*(\d+)", text, re.IGNORECASE)
        if hist_match:
            data["cb_person_cred_hist_length"] = int(hist_match.group(1))

        # ==========================================
        # 5. CATEGORICAL & DEFAULTS STRUCTURES
        # ==========================================
        for level in ["High School", "Associate", "Bachelor", "Master", "Doctorate"]:
            if re.search(r"\b" + re.escape(level) + r"\b", text, re.IGNORECASE):
                data["person_education"] = level
                break

        raw_gender_str = ""
        gender_adjacent = re.search(r"(?:Sex|Gender|GEN)[\s*:|\.\,-]*\s*([A-Za-z]+)", text, re.IGNORECASE)
        if gender_adjacent:
            raw_gender_str = gender_adjacent.group(1).strip()

        if not raw_gender_str or raw_gender_str.upper() not in ["M", "F", "MALE", "FEMALE"]:
            gender_label_match = re.search(r"(?:Sex|Gender|GEN)", text, re.IGNORECASE)
            if gender_label_match:
                start_idx = gender_label_match.end()
                window = text[start_idx : start_idx + 25].upper()
                
                if "FEMALE" in window:
                    raw_gender_str = "Female"
                elif "MALE" in window:
                    raw_gender_str = "Male"
                else:
                    char_match = re.search(r"\b(F|M)\b", window)
                    if char_match:
                        raw_gender_str = char_match.group(1)

        if raw_gender_str:
            normalized = raw_gender_str.upper()
            if normalized in ["F", "FEMALE", "FEM"]:
                data["person_gender"] = "Female"
            elif normalized in ["M", "MALE", "MAS"]:
                data["person_gender"] = "Male"

        for status in ["Rent", "Own", "Mortgage", "Other"]:
            if re.search(r"\b" + re.escape(status) + r"\b", text, re.IGNORECASE):
                data["person_home_ownership"] = status
                break

        intent_patterns = [
            (r"\bpersonal\b", "personal"),
            (r"\beducation\b", "education"),
            (r"\bmedical\b", "medical"),
            (r"\bventure\b", "venture"),
            (r"\bhome\s+improvement\b", "homeimprovement"),
            (r"\bdebt\s+consolidation\b", "debtconsolidation"),
            (r"\bhome\b", "homeimprovement"),
            (r"\bdebt\b", "debtconsolidation"),
        ]
        for pattern, normalized_value in intent_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                data["loan_intent"] = normalized_value
                break

        default_keywords = r"(?:Historical\s+Defaults|Previous\s+Defaults|Defaults|Collection\s+Account|Bankruptcy|Lien)"
        default_match = re.search(default_keywords + r"\s*:?\s*(Yes|No|Filed)?", text, re.IGNORECASE)
        
        if default_match and "no" in default_match.group(0).lower():
            data["previous_loan_defaults_on_file"] = "No"
        elif re.search(r"\b(?:Collection\s+Account|Bankruptcy|Lien|Chapter\s+7)\b", text, re.IGNORECASE):
            data["previous_loan_defaults_on_file"] = "Yes"
        elif default_match:
            val = default_match.group(1)
            data["previous_loan_defaults_on_file"] = "Yes" if val and "no" not in val.lower() else "No"

        return DocumentExtractionResponse(**data)