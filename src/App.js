import React, { useState, useEffect} from "react";
import { useSearchParams } from 'react-router-dom';
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
  const [fileUploadData, setFileUploadData] = useState(null);
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const[threeLegged, setThreeLegged] = useState(null);
  // useEffect(() => {
  //   console.log("code:", code);
  //   if (code) {
  //     setThreeLegged( getThreeLeggedToken(code))
  //   }
    
  // }, []);
  
  // const getThreeLeggedToken = async (authCode) => {
  //   const myHeaders = new Headers();
  //   myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  //   myHeaders.append("Authorization", "Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA==");

  //   const urlencoded = new URLSearchParams();
  //   urlencoded.append("grant_type", "authorization_code");
  //   urlencoded.append("code", authCode);
  //   urlencoded.append("redirect_uri", "http://localhost:3000/");

  //   const requestOptions = {
  //     method: "POST",
  //     headers: myHeaders,
  //     body: urlencoded,
  //     redirect: "follow"
  //   };

  //   try {
  //     const response = await fetch("https://developer.api.autodesk.com/authentication/v2/token", requestOptions);
  //     const result = await response.json();
      
  //     return result.access_token;
  //   } catch (error) {
  //     console.error("Error fetching 3-legged token:", error);
  //   }
  // };
 
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPdfFile(URL.createObjectURL(file));
    }
  };

  const getAccessToken = async () => {
    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization:
        "Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA==",
    });
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "data:read data:write",
    });
    const requestOptions = {
      method: "POST",
      headers,
      body,
      redirect: "follow",
    };
    try {
      const response = await fetch(
        "https://developer.api.autodesk.com/authentication/v2/token",
        requestOptions
      );
      const result = await response.json();
      return result.access_token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }
  };

  const exportFile = async () => {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOmNyZWF0ZSIsImRhdGE6cmVhZCIsImRhdGE6d3JpdGUiXSwiY2xpZW50X2lkIjoiYzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVAiLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiYXVkIjoiaHR0cHM6Ly9hdXRvZGVzay5jb20iLCJqdGkiOiJraDEzZlV2ZlNuNVZ1b2dOZWhvdnZXQkpIa1lxMkRxeTVZTGpaRmNBM3NEbk42V3hMUWxGdGQ4MGtlcGNvUEJHIiwiZXhwIjoxNzM5NTQxNzk5LCJ1c2VyaWQiOiI2TDkyUk0zVVFYM01IVlc2In0.JgOx5AeMwUT33r6fbUV_gOKn8QzPV0XbZWiip8PytE20gr2NFGtPSY32fC7AWZj9-BDh0OVNRCxhBD8PtjUmpNEzr3LeAd5QmqGNNhyOHJnpErAr7l1Fo26wBMLkfK12D-Z9imBsxqci9PXhiewALNRP4WUrtyhAqwfBl5FmSu34vUKFGKkwYIn6LsQSFM0WaBcq1fG2WTD_8S3L92BM_t7uBHl0-872hzmV-wttdHakKiECs_y0u8mWNxSjgDI4Br1GK0aucTt6mvaYvjVJDkEw3C7HRJKlZggjh1Iv400w-ywkOusKICYDp1FXA5Yxfd-Y7yeKD2i9KpQZyfrBrg");
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      "options": {
        "outputFileName": "console.pdf",
        "standardMarkups": {
          "includePublishedMarkups": true,
          "includeUnpublishedMarkups": true,
          "includeMarkupLinks": true
        },
        "issueMarkups": {
          "includePublishedMarkups": true,
          "includeUnpublishedMarkups": true
        },
        "photoMarkups": {
          "includePublishedMarkups": true,
          "includeUnpublishedMarkups": true
        }
      },
      "fileVersions": [
        fileUploadData[fileUploadData.length - 1].resourceUrn
      ]
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://developer.api.autodesk.com/construction/files/v1/projects/f514557e-3b26-434b-98fc-b743936e2aa0/exports", requestOptions);
      const result = await response.json();
      return await getExportedFile(result.id);
    } catch (error) {
      console.error("Error exporting file:", error);
    }
  };

  const getExportedFile = async (exportId) => {

    console.log("threeLegged:", threeLegged);
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer  eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOmNyZWF0ZSIsImRhdGE6cmVhZCIsImRhdGE6d3JpdGUiXSwiY2xpZW50X2lkIjoiYzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVAiLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiYXVkIjoiaHR0cHM6Ly9hdXRvZGVzay5jb20iLCJqdGkiOiJraDEzZlV2ZlNuNVZ1b2dOZWhvdnZXQkpIa1lxMkRxeTVZTGpaRmNBM3NEbk42V3hMUWxGdGQ4MGtlcGNvUEJHIiwiZXhwIjoxNzM5NTQxNzk5LCJ1c2VyaWQiOiI2TDkyUk0zVVFYM01IVlc2In0.JgOx5AeMwUT33r6fbUV_gOKn8QzPV0XbZWiip8PytE20gr2NFGtPSY32fC7AWZj9-BDh0OVNRCxhBD8PtjUmpNEzr3LeAd5QmqGNNhyOHJnpErAr7l1Fo26wBMLkfK12D-Z9imBsxqci9PXhiewALNRP4WUrtyhAqwfBl5FmSu34vUKFGKkwYIn6LsQSFM0WaBcq1fG2WTD_8S3L92BM_t7uBHl0-872hzmV-wttdHakKiECs_y0u8mWNxSjgDI4Br1GK0aucTt6mvaYvjVJDkEw3C7HRJKlZggjh1Iv400w-ywkOusKICYDp1FXA5Yxfd-Y7yeKD2i9KpQZyfrBrg");

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow"
    };

    try {
      const response = await fetch(`https://developer.api.autodesk.com/construction/files/v1/projects/f514557e-3b26-434b-98fc-b743936e2aa0/exports/${exportId}`, requestOptions);
      const result = await response.json();
      return result.result.output.signedUrl;
    } catch (error) {
      console.error("Error getting exported file:", error);
    }
  };

  const extractTextFromPDF = async () => {
    const resData = await exportFile();

    if (!resData) {
      console.error("Failed to get the exported file URL.");
      return;
    }

    try {
      const pdfUrl = resData;

      const response = await axios.get(
        `http://localhost:5000/download-pdf?url=${encodeURIComponent(pdfUrl)}`,
        {
          "access-control-allow-origin": "*",
          mode: "no-cors",
        }
      );
      console.log(response.data);

      const responseData = await fetch('http://localhost:5000/pdf');
      const blob = await responseData.blob();
      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext = {
        canvasContext: context,
        viewport,
      };
      await page.render(renderContext).promise;
      const image = canvas.toDataURL("image/png");
      Tesseract.recognize(image, "eng", {
        logger: (m) => console.log(m),
      }).then(async ({ data: { text } }) => {
        setExtractedText(text);
        // Call the Flask backend to extract the reference number
        const response = await fetch(
          "https://b6d6-103-176-186-246.ngrok-free.app/extract-ref-no",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          }
        );
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
      "Content-Type": "application/json",
    });

    const attributes = [
      {
        name: "Client Code",
        type: "array",
        arrayValues: [String(attributeData.client_code)],
      },
      {
        name: "Project Code",
        type: "array",
        arrayValues: [String(attributeData.project_code)],
      },
      {
        name: "Section Code",
        type: "array",
        arrayValues: [String(attributeData.section_code)],
      },
      {
        name: "Stakeholder Code",
        type: "array",
        arrayValues: [String(attributeData.stakeholder_code)],
      },
      {
        name: "Document Number",
        type: "string",
      },
      {
        name: "Document Code",
        type: "string",
      },
    ];

    const folderId =
      fileUploadData[fileUploadData.length - 1].payload.parentFolderUrn; //"urn:adsk.wipprod:fs.folder:co.drl6ho8FRr2DsgjduOGoVw";
    const projectId = fileUploadData[fileUploadData.length - 1].payload.project;

    const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/folders/${encodeURIComponent(
      folderId
    )}/custom-attribute-definitions`;

    for (const attribute of attributes) {
      const body = JSON.stringify(attribute);

      const requestOptions = {
        method: "POST",
        headers,
        body,
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
    const attributeName = result.name.toLowerCase().replace(/\s+/g, "_");
    const attributeValue = attributeData[attributeName];

    if (!attributeValue) {
      console.error(`No value found for attribute ${attributeName}`);
      return;
    }

    const customAttributes = [
      {
        id: result.id,
        value: attributeValue,
      },
    ];

    const versionId = fileUploadData[fileUploadData.length - 1].resourceUrn;
    const projectId = fileUploadData[fileUploadData.length - 1].payload.project;
    console.log("versionId:", versionId);
    console.log("projectId:", projectId);
    const accessToken = await getAccessToken();
    const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/versions/${encodeURIComponent(
      versionId
    )}/custom-attributes:batch-update`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.post(url, customAttributes, { headers });
      console.log("Custom attributes updated successfully:", response.data);
    } catch (error) {
      console.error(
        "Error updating custom attributes:",
        error.response ? error.response.data : error.message
      );
    }
  };

  const fetchWebhookData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/webhook-data");
      const data = response.data;
      console.log(data);
      setFileUploadData(data);
    } catch (error) {
      console.error("Error fetching webhook data:", error);
    }
  };

  return (
    <div className="App">
      <button onClick={fetchWebhookData}>get data from backend</button>
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