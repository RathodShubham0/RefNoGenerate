import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import re
import logging
import http.client
import json
import requests
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
logging.basicConfig(level=logging.INFO)
webhook_data = []
@app.route('/callback', methods=['POST'])
def callback():
    """Handle POST requests to /callback."""
    data = request.get_json()
    logging.info(f"Payload: {data}")
    webhook_data.append(data) 
    return jsonify({'status': 'success'}), 200
@app.route('/webhook-data', methods=['GET'])
def get_webhook_data():
    return jsonify(webhook_data), 200
# @app.route('/monitor', methods=['GET'])
# def monitor():
#     """Trigger the Autodesk API call and return the response."""
#     conn = http.client.HTTPSConnection("developer.api.autodesk.com")
#     payload = json.dumps({
#         "callbackUrl": "https://7119-103-176-186-246.ngrok-free.app/callback",
#         "scope": {
#             "folder": "urn:adsk.wipprod:fs.folder:co.RBNYDysUSA2bS1PASjj7SQ"
#         },
#         "hookAttribute": {
#             "projectId": "f514557e-3b26-434b-98fc-b743936e2aa0"
#         }
#     })
#     headers = {
#         'Content-Type': 'application/json',
#         'authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOmNyZWF0ZSIsImRhdGE6cmVhZCIsImRhdGE6d3JpdGUiXSwiY2xpZW50X2lkIjoiYzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVAiLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiYXVkIjoiaHR0cHM6Ly9hdXRvZGVzay5jb20iLCJqdGkiOiJ4TnJVVnM5QjNaYnpDdjNvSTRGT2ZJOWZFUmhXRzhJdXN5cTBUYnl6UXNyd3lBRVNxWFluRm5vWnpidVdxd1puIiwiZXhwIjoxNzM5NDUzODAwLCJ1c2VyaWQiOiI2TDkyUk0zVVFYM01IVlc2In0.mkm45d6kbUPlPnvbyqj9mJyiCaTNz0KA-9QOu4ToyUPWoQMnQMKS6wp2SAURR4XUFNud-ufRXMuop1NtGHMJeMJRDcx0f7Rfa0Wx5B2Pq6grx_OV-WVaPH0TsiE-DjMCeTRwGRCOMVvKsAC0x39Cki4pzIMjqhcJVsrlsQJtuEPtJRLgmXLWhHNWKeIH1R5uXn9XN4uAgk3qUZYcvgoefPaw0GW3y3byi9AePyzjJkmjH6adVoPAdTRsF5fw7Xa_bCxCHQ-9YndomQmJTeC-MRB12nciIKqTx5laEBd9xunKZ1go5Yi3VnhqYgvXVgHtdLcZ4Jq4poIow1yYSU3QPA'
#     }
#     conn.request("POST", "/webhooks/v1/systems/data/events/dm.version.added/hooks", payload, headers)
#     res = conn.getresponse()
#     data = res.read()
#     logging.info(f"Payload: {data}")
#     return data.decode("utf-8")
def extract_ref_number(text):
    """Extract different patterns for reference numbers from text."""
    patterns = [
        r'(?:Ref(?:\.|\. No\.)?:\s*)?([A-Z]+\/(?:[A-Z0-9]+\/)*[A-Z0-9]+)',  # Matches Ref. No.: KP/IM/00035/24
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)  # Extract the reference number only
    return None  # No Reference Number Found
def parse_document_reference(ref_number):
    """Parse the reference number into structured attributes."""
    pattern = r"(?P<project_code>\w+)/(?P<section_code>\w+)/(?P<client_code>\w+)/(?P<stakeholder_code>\w+)/(?P<document_code>\d+)/(?P<document_number>\d+)"
    
    match = re.match(pattern, ref_number)
    if match:
        return match.groupdict()
    else:
        return None
@app.route('/extract-ref-no', methods=['POST'])
def extract_ref_no():
    """API Endpoint to extract and parse reference number."""
    data = request.json
    text = data.get('text', '')
    # Step 1: Extract Reference Number
    ref_no = extract_ref_number(text)
    if not ref_no:
        return jsonify({'error': 'No valid reference number found'}), 400
    # Step 2: Parse Reference Number
    parsed_data = parse_document_reference(ref_no)
    if not parsed_data:
        return jsonify({'error': 'Invalid reference number format'}), 400
    # Step 3: Return Parsed Data to Frontend
    return jsonify({
        'refNo': ref_no,
        'parsedData': parsed_data
    })
@app.route('/proxy', methods=['GET', 'POST'])
def proxy():
    url = request.args.get('url')  # Get the target URL from the query parameter
    headers = {key: value for (key, value) in request.headers if key != 'Host'}  # Forward headers
    if request.method == 'POST':
        response = requests.post(url, headers=headers, data=request.get_data())
    else:
        response = requests.get(url, headers=headers)
    return (response.content, response.status_code, response.headers.items())
@app.route('/download-pdf', methods=['GET'])
def download_pdf():
    pdf_url = request.args.get('url')
    print(pdf_url)
    response = requests.get(pdf_url)
    
    # Ensure the public directory exists
    public_dir = os.path.join(os.getcwd(), 'public')
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
    
    file_path = os.path.join(public_dir, 'downloaded.pdf')
    with open(file_path, 'wb') as f:
        f.write(response.content)
    return jsonify({'message': 'File downloaded successfully', 'file_path': file_path})


@app.route('/pdf', methods=['GET'])
def serve_pdf():
    file_path = os.path.join(os.getcwd(), 'public', 'downloaded.pdf')
    try:
        return send_file(file_path, as_attachment=True, mimetype='application/pdf')
    except Exception as e:
        return str(e)
    
if __name__ == '__main__':
    app.run(debug=True)