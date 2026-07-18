# backend/app/seed_policy.py
import os
import chromadb
from chromadb.utils import embedding_functions

def seed_database_local():
    db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
    client = chromadb.PersistentClient(path=db_path)
    
    embedding_model = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    collection = client.get_or_create_collection(
        name="fannie_mae_compliance",
        embedding_function=embedding_model
    )

    # Clean out any old index blocks
    try:
        existing = collection.get()
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    # Dynamic RAG Node Mapping Payload
    policy_nodes = [
        {
            "id": "node_credit_score",
            "document": (
                "Fannie Mae Single Family Selling Guide Section B3-5.1-01: Minimum Representative Credit Score "
                "Requirements. Enforces a strict mandatory floor of 620 for traditional manual transactions. "
                "Delinquency overlays restrict conventional loan delivery flags if representative records drop beneath this cap."
            ),
            "metadata": {
                "topic": "credit",
                "title_underwriter": "Minimum Representative Credit",
                "title_borrower": "Your Credit Score Health",
                "summary_citation": "SECTION B3-5.1-01: Enforces a minimum credit score baseline of 620 for manual fixed-rate deliveries.",
                "section_summary": (
                    "SUMMARY OF SECTION B3-5.1-01: This section establishes the minimum representative credit score "
                    "standards required for traditional conventional fixed-rate and adjustable-rate mortgages (ARMs). "
                    "It outlines the operational framework for identifying the representative score across multiple credit "
                    "bureaus, setting a mandatory absolute baseline minimum score of 620 for low-variance manual "
                    "underwriting paths. Profiles falling below this limit are disqualified from automated safe-harbor "
                    "allocations unless specialized community secondary lending exceptions apply."
                )
            }
        },
        {
            "id": "node_dti_ratio",
            "document": (
                "Fannie Mae Single Family Selling Guide Section B3-6-02: Debt-to-Income Framework Ceiling Boundaries. "
                "Maximum DTI limits clamp fixed obligations at 45.0% for conventional programmatic routing. Inclusion "
                "matrix structures mandate revolving, installment, and housing liabilities counts."
            ),
            "metadata": {
                "topic": "dti",
                "title_underwriter": "Debt-to-Income Framework Boundary",
                "title_borrower": "Monthly Debt Footprint Check",
                "summary_citation": "SECTION B3-6-02: Restricts standard manual underwriting configurations to a maximum DTI cap of 45.0%.",
                "section_summary": (
                    "SUMMARY OF SECTION B3-6-02: This section defines the calculations, requirements, and risk boundaries "
                    "governing a borrower's total monthly Debt-to-Income (DTI) ratio. It establishes a rigid structural ceiling "
                    "of 45.0% for conventional underwriting deliveries. The text covers mandatory inclusion rules for revolving "
                    "debts, installment obligations, and housing liabilities, while noting that variances up to 50% are strictly "
                    "restricted to high-liquidity applicants backed by extensive asset reserve balances or automated Desktop "
                    "Underwriter (DU) approvals."
                )
            }
        },
        {
            "id": "node_derogatory_history",
            "document": (
                "Fannie Mae Single Family Selling Guide Section B3-5.3-07: Significant Derogatory Credit Events and Default History. "
                "Establishes structural waiting periods following bankruptcies, foreclosures, or outstanding open defaults. "
                "Prior historical delinquency patterns freeze traditional agency delivery tracking loops."
            ),
            "metadata": {
                "topic": "defaults",
                "title_underwriter": "Derogatory Default Review",
                "title_borrower": "Prior Credit History Background",
                "summary_citation": "SECTION B3-5.3-07: Outstanding defaults compromise clean conventional loan assignment loops.",
                "section_summary": (
                    "SUMMARY OF SECTION B3-5.3-07: This section delineates the treatment of significant derogatory credit "
                    "events, including prior foreclosures, bankruptcies, and outstanding repository loan defaults on active "
                    "files. It enforces mandatory waiting-period sequences (typically 2 to 7 years depending on termination type) "
                    "and requires comprehensive billing re-establishment trails. Outstanding un-extinguished defaults or "
                    "active delinquencies compromise structural assignment loops, requiring immediate manual intervention or "
                    "unconditional termination."
                )
            }
        }
    ]

    # Batch register items into ChromaDB
    collection.add(
        ids=[item["id"] for item in policy_nodes],
        documents=[item["document"] for item in policy_nodes],
        metadatas=[item["metadata"] for item in policy_nodes]
    )
    print("🎉 RAG database successfully seeded with dynamic metadata-summary assets!")

if __name__ == "__main__":
    seed_database_local()