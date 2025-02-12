from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

if __name__ == '__main__':
    app.run(debug=True)
