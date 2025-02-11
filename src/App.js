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
    const url = "https://developer.api.autodesk.com/construction/assets/v1/projects/f514557e-3b26-434b-98fc-b743936e2aa0/custom-attributes";
    const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOnJlYWQiXSwiY2xpZW50X2lkIjoiYzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVAiLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiYXVkIjoiaHR0cHM6Ly9hdXRvZGVzay5jb20iLCJqdGkiOiJTbUp4d2JMVWVXT250YWNmalY2cFhWQ1lEUVUzWDZlRVlGNGk5ZGhUMlJ5RGw3UEdUaWlWcWc1Z3ZqS1JsaFYwIiwiZXhwIjoxNzM5MjU1MzU0fQ.GWfHlLv-trpfhrEKXPyRqAfpsaVfrcwUlCBMfLQqtbG8jyvfkdUxcq5cYssbG8BQiB_Oq7WZMV5DDZL6NWt7YqYTv2YTazVhTkT6Ro2ylVc0o1WLuhTSswAvurHO0DcLrTFLLCC0zGIJ6mobqoR2G4l3U8-N26bnMYpbSWkIEtuNsPYBo0Yh_6Au3L_GkPTwCkXBdgQRq_lDFLNYxRi1omQB5vB43C0h3copNEfMpFiQL6F9ghLqEdDXd0fwGkTYTYdX222jAUBAOQr4U7iUGkNOofN3-FRhT8RxQ1ch4b5f9wucvGbUBwalqMTnc8Ql1Qx8lQ3ZM6hWDKEOC3gDAA"
    const customAttributeData = {
      name: "Reference Number",
      value: refNo,
      type: "text",
    };

    try {
      const response = await axios.post(url, customAttributeData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Custom attribute created:", response.data);
    } catch (error) {
      console.error("Error creating custom attribute:", error);
    }
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