import React, {useState} from 'react';
import {Document, Page, pdfjs} from 'react-pdf';
import './PdfSummarizer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfSummarizer = () => {
    const [file, setFile] = useState(null);
  
   
    const [text, setText] = useState('');
    const [summary, setSummary] = useState('');
    

    const onFileChange = async (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            const typedArray = new Uint8Array(buffer);
            const pdf = await pdfjs.getDocument(typedArray).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const pageText = await page.getTextContent();
                const pageString = pageText.items.map((item) => item.str).join('\n');
                fullText += pageString + '\n';
            }

            setText(fullText);

            const pdfInfo = await pdf.getMetadata();
         
        };

        reader.readAsArrayBuffer(selectedFile);
    };

    const summarizeText = async () => {
        
        setSummary(text);
    };

    return (
        <div className="container">
            <h1>PDF Summarizer</h1>
            <input type="file" onChange={onFileChange}/>
            {file && (
                <div className="pdf-info">
                    <Document file={file}  >
                         <Page pageNumber={1} />
                    </Document>
                </div>
            )}
            <button className="button" onClick={summarizeText} disabled={!file}>Summarize</button>
            <div className="summary">
                <h3>Summary</h3>
                <p>{text}</p>
            </div>

             
        </div>
    );
};

export default PdfSummarizer;
