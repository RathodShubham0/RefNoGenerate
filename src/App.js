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
  const getAccessToken = async () => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", "Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA==");
  
    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("scope", "data:read data:write");
  
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow"
    };
  
    try {
      const response = await fetch("https://developer.api.autodesk.com/authentication/v2/token", requestOptions);
      const result = await response.json();
      return result.access_token;
    } catch (error) {
      console.error("Error fetching access token:", error);
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
        console.log(data.refNo);
        // Create a new custom attribute in Autodesk Construction Cloud
        await createCustomAttribute(data.refNo);

         const projectId = '';
        const versionId = 'urn:adsk.wipprod:fs.file:vf.pIV994alTz-rHQND52XyPg?version=1'

 
        // Custom attributes to update
        const customAttributes = [
          {
            id: 5716121, // Replace with your custom attribute ID
            value: 'checked_updated',
          
          },
        ];

        updateCustomAttributes(projectId, versionId, customAttributes);
      });
    } catch (error) {
      console.error("Error extracting text:", error);
    }
  };

  const createCustomAttribute = async (refNo) => {
    const myHeaders = new Headers();
    let accessToken = await getAccessToken();
    myHeaders.append("Authorization", `Bearer ${accessToken}`);
    myHeaders.append("Content-Type", "application/json");
    
    const raw = JSON.stringify({
      "name": "Reference no",
      "type": "string",
   
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

   

async function updateCustomAttributes(projectId, versionId, customAttributes) {
  projectId = "f514557e-3b26-434b-98fc-b743936e2aa0"
  let accessToken = await getAccessToken();
  const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/versions/${encodeURIComponent(versionId)}/custom-attributes:batch-update`;
  console.log(url)

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, customAttributes, { headers });
    console.log('Custom attributes updated successfully:', response.data);
  } catch (error) {
    console.error('Error updating custom attributes:', error.response ? error.response.data : error.message);
  }
}




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