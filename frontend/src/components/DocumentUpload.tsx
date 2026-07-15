import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import type { LoanForm } from "../App";

interface DocumentUploadProps {
  onDocumentExtracted: (extractedData: Partial<LoanForm>) => void;
}

export default function DocumentUpload({ onDocumentExtracted }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus(`Reading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Document extraction failed.");

      const result = await response.json();
      
      // Clean payload and count verified fields
      const cleanedData: Partial<LoanForm> = {};
      let fieldsExtractedCount = 0;

      Object.keys(result).forEach((key) => {
        const value = result[key];
        if (value !== null && value !== undefined && value !== "") {
          cleanedData[key as keyof LoanForm] = value;
          fieldsExtractedCount++;
        }
      });

      // Dynamic alert notifications handling based on real parameters found
      if (fieldsExtractedCount > 0) {
        onDocumentExtracted(cleanedData);
        setUploadStatus(`✓ Successfully extracted ${fieldsExtractedCount} parameters from ${file.name}!`);
      } else {
        setUploadStatus(`⚠ No recognizable loan parameters could be extracted from "${file.name}".`);
      }

    } catch {
      setUploadStatus("✕ Couldn't process document configuration automatically.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBoxClick}
      style={{
        border: isDragging ? "2px dashed #4b6fff" : "2px dashed #d8e0ed",
        background: isDragging ? "#f0f4ff" : "#fbfcff",
        padding: "30px 20px",
        borderRadius: "12px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        margin: "0 auto 24px auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".pdf,.txt,image/*"
      />
      
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
      <h4 style={{ margin: "0 0 6px 0", color: "#172033", fontSize: "16px" }}>
        {isProcessing ? "Analyzing Document Architecture..." : "Drop files here or click to upload any files that may help"}
      </h4>
      <p style={{ margin: "0 0 16px 0", color: "#6b7891", fontSize: "13px" }}>
        LendScope parses unstructured records to auto-populate your configuration fields.
      </p>

      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", padding: "4px 10px", background: "#eef3ff", color: "#263c78", borderRadius: "999px", fontWeight: 700 }}>💡 Pay Stubs</span>
        <span style={{ fontSize: "11px", padding: "4px 10px", background: "#eef3ff", color: "#263c78", borderRadius: "999px", fontWeight: 700 }}>💡 Credit Bureau Files</span>
        <span style={{ fontSize: "11px", padding: "4px 10px", background: "#eef3ff", color: "#263c78", borderRadius: "999px", fontWeight: 700 }}>💡 Bank Statements</span>
      </div>

      {uploadStatus && (
        <div style={{ 
          marginTop: "16px", 
          fontSize: "13px", 
          fontWeight: 700, 
          color: uploadStatus.includes("Successfully") ? "#2f9d55" : "#bd2525" 
        }}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
}