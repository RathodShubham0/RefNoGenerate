import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Tesseract from "tesseract.js";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");

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
      }).then(({ data: { text } }) => {
        setExtractedText(text);
      });
    } catch (error) {
      console.error("Error extracting text:", error);
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
      {extractedText && <pre>{extractedText}</pre>}
    </div>
  );
}

export default App;