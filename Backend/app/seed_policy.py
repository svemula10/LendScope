# backend/app/seed_policy.py
import os
import chromadb
from chromadb.utils import embedding_functions

def seed_database_local():
    print("🚀 Initializing LendScope Local Policy Ingestion Pipeline...")
    
    # Establish persistent database folder path
    db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
    client = chromadb.PersistentClient(path=db_path)
    
    # Use high-quality local sentence transformer embedding function
    embedding_model = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    # Clear out broken or empty tracking instances if they exist
    try:
        client.delete_collection("fannie_mae_compliance")
        print("🧹 Cleared obsolete collection states cleanly.")
    except Exception:
        pass
        
    collection = client.get_or_create_collection(
        name="fannie_mae_compliance", 
        embedding_function=embedding_model
    )
    
    # Target our local unedited corporate policy guide file
    file_path = os.path.join(os.path.dirname(__file__), "policies", "fannie_mae_guide.txt")
    
    if not os.path.exists(file_path):
        print(f"❌ Ingestion Error: Matrix target missing at {file_path}")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
        
    # Split text blocks parsing cleanly by explicit SECTION line indicators
    raw_sections = raw_text.split("SECTION ")
    
    all_chunks = []
    all_metadatas = []
    all_ids = []
    chunk_counter = 0
    
    for section_block in raw_sections:
        clean_block = section_block.strip()
        if not clean_block:
            continue
            
        # Reconstruct full block text string
        full_text = f"SECTION {clean_block}"
        
        # Extract specific legal section code from header line (e.g., B3-6-02)
        header_line = clean_block.split("\n")[0]
        section_code = header_line.split(":")[0].strip()
        
        # Assign contextual query categories to speed up filter mapping lookups
        topic_tag = "general"
        lower_text = clean_block.lower()
        if "credit score" in lower_text or "fico" in lower_text:
            topic_tag = "credit"
        elif "debt-to-income" in lower_text or "dti" in lower_text or "ratio" in lower_text:
            topic_tag = "dti"
        elif "income" in lower_text or "paystub" in lower_text or "W2" in lower_text:
            topic_tag = "income"
            
        all_chunks.append(full_text)
        all_metadatas.append({"section": section_code, "topic": topic_tag})
        all_ids.append(f"policy_chunk_{chunk_counter}")
        chunk_counter += 1
        
    if all_chunks:
        print(f"📦 Mapping and vectorizing {len(all_chunks)} core handbook chunks...")
        collection.add(documents=all_chunks, metadatas=all_metadatas, ids=all_ids)
        print("✅ Success! Your RAG Database Engine is completely initialized offline.")
    else:
        print("❌ Script aborted: No readable data markers extracted.")

if __name__ == "__main__":
    seed_database_local()