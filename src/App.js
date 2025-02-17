import React, { useState, useEffect} from "react";
import { useSearchParams } from 'react-router-dom';
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Tesseract from "tesseract.js";
import { pdfjs } from "react-pdf";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import "./App.css";
import Tooltip from '@mui/material/Tooltip';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


const App = () => {
 
  const [extractedText, setExtractedText] = useState("");
  const [refNo, setRefNo] = useState("");
  const [fileUploadData, setFileUploadData] = useState(null);
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [webhookData, setWebhookData] = useState(null);
 

 
    const [threeLegged, setThreeLegged] = useState(() => sessionStorage.getItem('autodesk_token'));
    const location = useLocation();
  
    useEffect(() => {
      if (sessionStorage.getItem('autodesk_token')) return;
  
      const params = new URLSearchParams(location.search);
      const authCode = params.get('code');
  
      if (!authCode) return;
  
      const fetchToken = async () => {
        try {
          const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA=='
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: 'http://localhost:3000/'
            })
          });
  
          const data = await response.json();
          if (data.access_token) {
            sessionStorage.setItem('autodesk_token', data.access_token);
            setThreeLegged(data.access_token);
          }
        } catch (error) {
          console.error('Error fetching token:', error);
        }
      };
  
      fetchToken();
    }, [location, threeLegged]);
  
 
  

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
    myHeaders.append("Authorization", `Bearer ${threeLegged}`);
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
    const myHeaders = {
      Authorization: `Bearer ${threeLegged}`,
    };
  
    const requestOptions = {
      method: "GET",
      headers: myHeaders,
    };
  
    const fetchFile = async () => {
      try {
        const response = await axios.get(
          `https://developer.api.autodesk.com/construction/files/v1/projects/f514557e-3b26-434b-98fc-b743936e2aa0/exports/${exportId}`,
          requestOptions
        );
  
        const result = response.data;
  
        if (result.result.output.signedUrl) {
          return result.result.output.signedUrl;
        } else {
          throw new Error("Signed URL not ready yet");
        }
      } catch (error) {
        console.error("Error getting exported file, retrying in 2 seconds...", error);
        return null;
      }
    };
  
    let url = await fetchFile();
    if (!url) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      url = await fetchFile();
    }
  
    return url;
  };

  const extractTextFromPDF = async () => {
    toast.info("Starting PDF extraction...");
    const resData = await exportFile();

    if (!resData) {
      toast.error("Failed to get the exported file URL.");
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
          "http://localhost:5000/extract-ref-no",
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
        toast.success("PDF extraction completed successfully and Attributes are added to acc!");
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
      const data1 = data[data.length - 1]
      setWebhookData({
        project: data1.payload.project,
        fileName: data1.payload.name,
        createdBy: data1.payload.context.lineage.createUserName,
        createdTime: data1.payload.context.lineage.createTime,
      });
      console.log("Webhook data:", webhookData);
   
    } catch (error) {
      console.error("Error fetching webhook data:", error);
    }
  };

  return (
    <div className="App">
       <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" style={{backgroundColor: "black"}}>
        <Toolbar>
          {/* <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton> */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: "left", fontSize: "14px" }}>
          Reference Number Generation
          </Typography>
          <Tooltip title="Fetch data from Autodesk ACC via Webhook" arrow>
        <button onClick={fetchWebhookData} style={{backgroundColor: "#11546a", color:"white"}}>Fetch Data from ACC</button>
      </Tooltip>
      <Tooltip title="Extract Reference Number From Download file" arrow>
      <button onClick={extractTextFromPDF} style={{backgroundColor: "#11546a", color:"white"}}>Extract reference Number</button></Tooltip>
          {/* <Button color="inherit">Login</Button> */}
        </Toolbar>
      </AppBar>
    </Box>
      
      

 
      {refNo && (
        <div className="webhook-data-box" style={{marginTop: "90px"}}>
          <h5 style={{color:"#11546a"}}>Reference Number Extracted from PDF</h5>
          <h6 style={{fontSize: "14px"}}><p>{refNo}</p></h6>
        </div>
      )}
      {webhookData && (
        <div className="webhook-data-box">
          <h5 style={{color:"#11546a"}}>Webhook Data</h5>
          <h6 style={{fontSize: "14px"}}><p><strong>Project:</strong> {webhookData.project}</p></h6>
          <h6 style={{fontSize: "14px"}}><p><strong>File Name:</strong> {webhookData.fileName}</p></h6>
          <h6 style={{fontSize: "14px"}}><p><strong>Created By:</strong> {webhookData.createdBy}</p></h6>
          <h6 style={{fontSize: "14px"}}><p><strong>Created At:</strong> {webhookData.createdTime}</p></h6>
        </div>
      )}
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default App;