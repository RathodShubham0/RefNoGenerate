import React, { useState } from "react";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Tesseract from "tesseract.js";
import { pdfjs } from "react-pdf";
import axios from "axios";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const App = () => {
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
    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": "Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA=="
    });

    const body = new URLSearchParams({
      "grant_type": "client_credentials",
      "scope": "data:read data:write"
    });

    const requestOptions = {
      method: "POST",
      headers,
      body,
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
        viewport
      };

      await page.render(renderContext).promise;

      const image = canvas.toDataURL("image/png");

      Tesseract.recognize(image, "eng", {
        logger: (m) => console.log(m)
      }).then(async ({ data: { text } }) => {
        setExtractedText(text);

        // Call the Flask backend to extract the reference number
        const response = await fetch('http://localhost:5000/extract-ref-no', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        });

        const data = await response.json();
        setRefNo(data.refNo);

        // Create a new custom attribute in Autodesk Construction Cloud
        await createCustomAttribute(data.parsedData);
      });
    } catch (error) {
      console.error("Error extracting text:", error);
    }
  };

  const createCustomAttribute = async (attributeData) => {
    const accessToken = await getAccessToken();
    const headers = new Headers({
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    });

    const attributes = [
      {
        name: "Client Code",
        type: "array",
        arrayValues: [String(attributeData.client_code)]
      },
      {
        name: "Project Code",
        type: "array",
        arrayValues: [String(attributeData.project_code)]
      },
      {
        name: "Section Code",
        type: "array",
        arrayValues: [String(attributeData.section_code)]
      },
      {
        name: "Stakeholder Code",
        type: "array",
        arrayValues: [String(attributeData.stakeholder_code)]
      },
      {
        name: "Document Number",
        type: "string"
      },
      {
        name: "Document Code",
        type: "string"
      }
    ];

    const folderId = "urn:adsk.wipprod:fs.folder:co.drl6ho8FRr2DsgjduOGoVw";
    const projectId = "f514557e-3b26-434b-98fc-b743936e2aa0";
    const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/folders/${encodeURIComponent(folderId)}/custom-attribute-definitions`;

    for (const attribute of attributes) {
      const body = JSON.stringify(attribute);

      const requestOptions = {
        method: "POST",
        headers,
        body
      };

      try {
        const response = await fetch(url, requestOptions);
        const result = await response.json();
        await updateCustomAttributes(result, attributeData);
        console.log(`Attribute ${attribute.name} created:`, result);
      } catch (error) {
        console.error(`Error creating attribute ${attribute.name}:`, error);
      }
    }
  };

  const updateCustomAttributes = async (result, attributeData) => {
    const attributeName = result.name.toLowerCase().replace(/\s+/g, '_');
    const attributeValue = attributeData[attributeName];

    if (!attributeValue) {
      console.error(`No value found for attribute ${attributeName}`);
      return;
    }

    const customAttributes = [
      {
        id: result.id,
        value: attributeValue
      }
    ];

    const versionId = 'urn:adsk.wipprod:fs.file:vf.9YFgpsqQQ5mxVFj6UVXI-g?version=1';
    const projectId = "f514557e-3b26-434b-98fc-b743936e2aa0";
    const accessToken = await getAccessToken();
    const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/versions/${encodeURIComponent(versionId)}/custom-attributes:batch-update`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(url, customAttributes, { headers });
      console.log('Custom attributes updated successfully:', response.data);
    } catch (error) {
      console.error('Error updating custom attributes:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <div className="App">
      <h1>PDF Data Extractor</h1>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
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
};

export default App;