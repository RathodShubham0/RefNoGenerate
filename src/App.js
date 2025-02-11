import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Tesseract from "tesseract.js";
import { pdfjs } from "react-pdf";
import axios from "axios";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [refNo, setRefNo] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPdfFile(URL.createObjectURL(file));
    }
  };

  const extractTextFromPDF = async () => {
    if (!pdfFile) return;

    try {
      const loadingTask = pdfjs.getDocument(pdfFile);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      const image = canvas.toDataURL("image/png");

      Tesseract.recognize(image, "eng", {
        logger: (m) => console.log(m),
      }).then(async ({ data: { text } }) => {
        setExtractedText(text);

        // Call the Flask backend to extract the reference number
        const response = await fetch('http://localhost:5000/extract-ref-no', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();
        setRefNo(data.refNo);

        // Create a new custom attribute in Autodesk Construction Cloud
        await createCustomAttribute(data.refNo);
      });
    } catch (error) {
      console.error("Error extracting text:", error);
    }
  };

  const createCustomAttribute = async (refNo) => {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOnJlYWQiLCJkYXRhOndyaXRlIl0sImNsaWVudF9pZCI6ImM3SUpET2tXeW9VTXp2bUFpSEppMUI5SHV5cTNaMTFQIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wZXIuYXBpLmF1dG9kZXNrLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXV0b2Rlc2suY29tIiwianRpIjoiZkNaSnNtblRRSUxEeVdDVnJ1MEJYMG91WFdKaE9hejFWUXY0dlNDVTJld1BxcXY4WE04dUwzVE1xdVd1QWhkZSIsImV4cCI6MTczOTI3NjgxMH0.LVxwLDMv0lIkkyvMRF-8p7Yby3GUOs47RsSHDCDl3qADUCy9CFX29SfoGpLrSdpDHqv0Ioq6DAVZCmX6mCbuZ2lQB1nFxi1ze8rV69FTscEqBOvEDcO0CqtB_LRnXbjfTxuDT-wfc5L9al67Esx2XAVulz4kiqk08qQEv_2H6exx77Bzn0nwc3uFr2qPdXJhwlW7uod93vt_pBZtjmu7YVLa-uowO_GqRFMUNaNahQ-8Y5tknk4Y0fOHqbsICrS9cU-2Is7xhXvqqnvOc4vIFCCQn1NQttX8e8cg-rFNWE-1mR7MHvDNZLLRDs3faOxTUfKMZjQ7ULYznlC_Z0Cesw");
    myHeaders.append("Content-Type", "application/json");
    
    const raw = JSON.stringify({
      "name": "Reference no",
      "type": "string",
      "value": refNo
    });
    
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };
    
    fetch("https://developer.api.autodesk.com/bim360/docs/v1/projects/f514557e-3b26-434b-98fc-b743936e2aa0/folders/urn%3Aadsk.wipprod%3Afs.folder%3Aco.drl6ho8FRr2DsgjduOGoVw/custom-attribute-definitions", requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  };

  return (
    <div className="App">
      <h1>PDF Data Extractor</h1>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
      {pdfFile && (
        <div style={{ height: "600px" }}>
          <Worker workerUrl={`//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`}>
            <Viewer fileUrl={pdfFile} />
          </Worker>
        </div>
      )}
      <button onClick={extractTextFromPDF}>Extract Text</button>
      {extractedText && (
        <div>
          <h3>Extracted Text</h3>
          <pre>{extractedText}</pre>
        </div>
      )}
      {refNo && (
        <div>
          <h3>Reference Number</h3>
          <p>{refNo}</p>
        </div>
      )}
    </div>
  );
}

export default App;