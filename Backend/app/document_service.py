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
        # 2. AGE / DOB EXTRACTION (Fixed for AAMVA "3 DOB" & OCR O/0 Faults)
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
                    # Upgraded regex: matches numeric configurations OR full/short month name configurations
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
                # Clean common OCR reading glitches
                raw_date_str = raw_date_str.replace('O', '0').replace('o', '0').strip()
                
                # First, extract any explicit 4-digit year format (e.g., 1974 or 1970)
                four_digit_year_match = re.search(r"\b(19\d{2}|20[0-2]\d)\b", raw_date_str)
                
                if four_digit_year_match:
                    birth_year = int(four_digit_year_match.group(1))
                    data["person_age"] = 2026 - birth_year
                else:
                    # Fallback for 2-digit numeric dates (e.g., -85 or /85)
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

        # FIXED: Explicitly ignore "EXP:" if it appears directly next to numbers resembling a license expiration date
        if re.search(r"\b(?:EXP)\b\s*:\s*[\d]{2}", text, re.IGNORECASE):
            # If it's a license expiration date string, skip evaluating simple "EXP" acronym check
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
        # Education
        for level in ["High School", "Associate", "Bachelor", "Master", "Doctorate"]:
            if re.search(r"\b" + re.escape(level) + r"\b", text, re.IGNORECASE):
                data["person_education"] = level
                break

        # Gender
        raw_gender_str = ""

        # Tier 1: Adjacent Context Check (Drops strict word boundaries to allow "15SEX" variants)
        gender_adjacent = re.search(r"(?:Sex|Gender|GEN)[\s*:|\.\,-]*\s*([A-Za-z]+)", text, re.IGNORECASE)
        if gender_adjacent:
            raw_gender_str = gender_adjacent.group(1).strip()

        # Tier 2: Isolated Window Bubble Protection
        # Choops a narrow snippet right after the label to locate explicit characters or words
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
                    # Enforce boundary restrictions on solitary values so we don't accidentally capture words like "MAIN"
                    char_match = re.search(r"\b(F|M)\b", window)
                    if char_match:
                        raw_gender_str = char_match.group(1)

        # Normalize token outputs to match schema requirements
        if raw_gender_str:
            normalized = raw_gender_str.upper()
            if normalized in ["F", "FEMALE", "FEM"]:
                data["person_gender"] = "Female"
            elif normalized in ["M", "MALE", "MAS"]:
                data["person_gender"] = "Male"

        # --- TIER 3: Universal OCR Character-Swap Corrections ---
        # If we found a string token, normalize it to the schema display expectations ("Male" or "Female")
        if raw_gender_str:
            normalized = raw_gender_str.upper()
            if normalized in ["F", "FEMALE", "FEM"]:
                data["person_gender"] = "Female"
            elif normalized in ["M", "MALE", "MAS"]:
                data["person_gender"] = "Male"
        else:
            # Complete Fallback: Scan the lines array for standard AAMVA pattern "15SEX: [Letter]" 
            # even if Tesseract completely corrupted the letter 'F' or 'M' into an artifact like 'E', 'l', or '1'
            for line in lines:
                if "15" in line and "SEX" in line:
                    # If it's a female indicator misread as an E or 1
                    if any(err in line.upper() for err in [" F", " E", " I"]):
                        data["person_gender"] = "Female"
                        break
                    # If it's a male indicator misread as a 1 or vertical pipe
                    elif any(err in line.upper() for err in [" M", " 1", " |"]):
                        data["person_gender"] = "Male"
                        break

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