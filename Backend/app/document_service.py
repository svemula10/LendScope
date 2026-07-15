import re
import pymupdf
from PIL import Image
import io
from app.schemas import DocumentExtractionResponse

class DocumentService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
        extracted_text = ""
        lower_name = filename.lower()

        if any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            try:
                import pytesseract
                image = Image.open(io.BytesIO(file_bytes))
                extracted_text = pytesseract.image_to_string(image)
            except Exception as e:
                print(f"OCR image failure: {e}")
            return extracted_text

        elif lower_name.endswith(".pdf"):
            try:
                doc = pymupdf.open(stream=file_bytes, filetype="pdf")
                for page in doc:
                    text = page.get_text()
                    if len(text.strip()) < 40:
                        try:
                            text = page.get_textpage_ocr(language="eng").extractText()
                        except Exception:
                            try:
                                import pytesseract
                                pix = page.get_pixmap(dpi=150)
                                image = Image.open(io.BytesIO(pix.tobytes("png")))
                                text = pytesseract.image_to_string(image)
                            except Exception:
                                pass
                    extracted_text += text + "\n"
            except Exception as e:
                print(f"PDF structure failure: {e}")
            return extracted_text

        elif lower_name.endswith(".txt"):
            return file_bytes.decode("utf-8", errors="ignore")
        
        return extracted_text

    @classmethod
    async def extract_fields_from_text(cls, text: str) -> DocumentExtractionResponse:
        # Initialize dictionary keys
        data = {field: None for field in DocumentExtractionResponse.__fields__.keys()}
        if not text.strip():
            return DocumentExtractionResponse(**data)

        # --- Clean Line Splits Utility ---
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # ==========================================
        # 1. APPLICANT NAME EXTRACTION
        # ==========================================
        # Match standard credit reports, txt fields, and license formats (Prefix 1/2 or LN/FN)
        name_match = re.search(r"(?:Applicant\s+Name|Names?\s+Reported|Employee\s+Name|Customer\s+Name|Name|1|2|LN|FN)\s*:?\s*([A-Za-z\s\.\,\-]+)", text, re.IGNORECASE)
        if name_match:
            potential_name = name_match.group(1).split("\n")[0].strip()
            # Stop collection if lines spill directly into trailing fields
            potential_name = re.sub(r"\b(?:Date|DOB|Birth|Age|Income|SSN|Address|Telephone|Phone)\b.*$", "", potential_name, flags=re.IGNORECASE).strip()
            # Clean commas (e.g., "SAMPLE, ANDREW JASON" -> "Andrew Jason Sample")
            if "," in potential_name:
                parts = [p.strip() for p in potential_name.split(",")]
                potential_name = " ".join(parts[::-1])
            if potential_name and len(potential_name.split()) >= 2:
                data["applicant_name"] = potential_name.title()

        # ==========================================
        # 2. AGE / DOB EXTRACTION
        # ==========================================
        # Check direct numeric entry
        age_match = re.search(r"\b(?:Age)\s*:?\s*(\d+)\b", text, re.IGNORECASE)
        if age_match:
            data["person_age"] = int(age_match.group(1))
        else:
            # Fallback to date calculations (DOB)
            dob_match = re.search(r"\b(?:DOB|Birth|Date\s+of\s+Birth)\s*:?\s*([\d\-\/]{8,10}|[A-Za-z]+\s+\d+\,\s+\d{4})", text, re.IGNORECASE)
            if dob_match:
                raw_date = dob_match.group(1)
                year_match = re.search(r"\b(19\d{2}|20[0-2]\d)\b", raw_date)
                if year_match:
                    data["person_age"] = 2026 - int(year_match.group(1))

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

        exp_match = re.search(r"(?:Employment\s+Experience|Work\s+History|Years\s+of\s+Exp|Exp)\s*:?\s*(\d+)", text, re.IGNORECASE)
        if exp_match:
            data["person_emp_exp"] = int(exp_match.group(1))

        hist_match = re.search(r"(?:Credit\s+History\s+Length|History\s+Length|Credit\s+Age)\s*:?\s*(\d+)", text, re.IGNORECASE)
        if hist_match:
            data["cb_person_cred_hist_length"] = int(hist_match.group(1))

        # ==========================================
        # 5. CATEGORICAL & DEFAULTS STRUCTURES
        # ==========================================
        # Education
        for level in ["High School", "Associate", "Bachelor", "Master", "Doctorate"]:
            if re.search(r"\b" + re.escape(level) + r"\b", text, re.IGNORECASE):
                data["person_education"] = level
                break

        # Gender
        if re.search(r"\b(?:Female|F)\b", text, re.IGNORECASE): data["person_gender"] = "Female"
        elif re.search(r"\b(?:Male|M)\b", text, re.IGNORECASE): data["person_gender"] = "Male"

        # Home Ownership
        for status in ["Rent", "Own", "Mortgage", "Other"]:
            if re.search(r"\b" + re.escape(status) + r"\b", text, re.IGNORECASE):
                data["person_home_ownership"] = status
                break

        # Loan Intent (Normalized space matching e.g. "debtconsolidation" vs "Debt Consolidation")
        intent_map = {
            "personal": "Personal", "education": "Education", "medical": "Medical",
            "venture": "Venture", "home": "Home Improvement", "debt": "Debt Consolidation"
        }
        for key, display in intent_map.items():
            if re.search(r"\b" + re.escape(key) + r"\w*", text, re.IGNORECASE):
                data["loan_intent"] = display
                break

        # Historical Defaults & Collections Integration
        # Accounts flagging collections, bankruptcies, liens, or explicit historical defaults
        default_keywords = r"(?:Historical\s+Defaults|Previous\s+Defaults|Defaults|Collection\s+Account|Bankruptcy|Lien)"
        default_match = re.search(default_keywords + r"\s*:?\s*(Yes|No|Filed)?", text, re.IGNORECASE)
        
        # If explicitly stated "no", or if keywords appear dynamically but are absent, deduce state
        if default_match and "no" in default_match.group(0).lower():
            data["previous_loan_defaults_on_file"] = "No"
        elif re.search(r"\b(?:Collection\s+Account|Bankruptcy|Lien|Chapter\s+7)\b", text, re.IGNORECASE):
            data["previous_loan_defaults_on_file"] = "Yes"
        elif default_match:
            val = default_match.group(1)
            data["previous_loan_defaults_on_file"] = "Yes" if val and "no" not in val.lower() else "No"

        return DocumentExtractionResponse(**data)