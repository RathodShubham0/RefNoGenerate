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
# Ref.:KP/SO/X202/C/00188/24
# Ref. No.:KP/IM/00035/24
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group()
    return "No Reference Number Found"

@app.route('/extract-ref-no', methods=['POST'])
def extract_ref_no():
    # Extract the text data from the request JSON
    data = request.json
    text = data.get('text', '')

    # Extract reference number from the provided text
    ref_no = extract_ref_number(text)
    
    return jsonify({'refNo': ref_no})

if __name__ == '__main__':
    app.run(debug=True)
