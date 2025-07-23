#!/usr/bin/env python3

import os
import sys
import json
import tempfile
import urllib.parse
from http.server import BaseHTTPRequestHandler

# Add the parent directory to sys.path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our existing wordcloud generation functions
try:
    from generate_wordcloud import (
        load_and_process_csv, 
        generate_wordcloud, 
        ensure_nltk_data,
        get_default_verb_settings
    )
except ImportError as e:
    print(f"Import error: {e}")

# Import cloud storage functions
def get_data_from_blob():
    """Get data from Vercel Blob storage"""
    try:
        # Try to import and use cloud storage
        sys.path.append('/var/task/api')  # Vercel function path
        from cloud_storage import getDataWithInit
        result = getDataWithInit()
        if result.get('success') and result.get('data'):
            return result['data'], 'vercel-blob'
    except Exception as e:
        print(f"Failed to get data from Vercel Blob: {e}")
    
    # Fallback to local file for development
    try:
        csv_path = os.environ.get('CSV_FILE_PATH', 'data/demo_feedback.csv')
        if os.path.exists(csv_path):
            import pandas as pd
            df = pd.read_csv(csv_path)
            return df.to_dict('records'), 'local-file'
    except Exception as e:
        print(f"Failed to load local file: {e}")
    
    return None, None

def convert_data_to_csv(data):
    """Convert data array to CSV string"""
    if not data:
        return ""
    
    import pandas as pd
    df = pd.DataFrame(data)
    return df.to_csv(index=False)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Ensure NLTK data is available
            ensure_nltk_data()
            
            # Parse the URL and query parameters
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            
            print(f"API called with query: {query_params}")
            
            # Determine which type of word cloud to generate
            verbs_only = query_params.get('verbs', ['false'])[0].lower() == 'true'
            
            print(f"Generating word cloud: verbs_only={verbs_only}")
            
            # Get data from Vercel Blob or local file
            data, data_source = get_data_from_blob()
            
            if not data:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = {
                    'success': False,
                    'error': 'No data available',
                    'details': 'Could not load data from Vercel Blob or local files'
                }
                self.wfile.write(json.dumps(error_response).encode())
                return
            
            print(f"Loaded {len(data)} records from {data_source}")
            
            # Create temporary CSV file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
                csv_content = convert_data_to_csv(data)
                temp_file.write(csv_content)
                temp_csv_path = temp_file.name
            
            try:
                # Parse verb settings if provided
                settings = None
                if verbs_only:
                    settings = get_default_verb_settings()
                    # You can enhance this to parse settings from query params if needed
                
                # Generate word cloud
                print(f"Processing CSV file: {temp_csv_path}")
                processed_text = load_and_process_csv(temp_csv_path, verbs_only, False, False, settings)
                
                if not processed_text:
                    raise Exception("No text was processed from the CSV data")
                
                print(f"Processed text length: {len(processed_text)}")
                
                # Generate the word cloud image
                output_file = 'public/wordcloud_verbs.png' if verbs_only else 'public/wordcloud_all.png'
                image_path = f"/{os.path.basename(output_file)}"
                
                # Ensure public directory exists
                os.makedirs('public', exist_ok=True)
                
                success = generate_wordcloud(processed_text, output_file)
                
                if not success:
                    raise Exception("Word cloud generation failed")
                
                # Verify the image was created
                if not os.path.exists(output_file):
                    raise Exception(f"Expected output file not found: {output_file}")
                
                print(f"Word cloud generated successfully: {output_file}")
                
                # Return success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': 'Word cloud generated successfully',
                    'imagePath': image_path,
                    'recordCount': len(data),
                    'dataSource': data_source,
                    'mode': 'verbs' if verbs_only else 'all',
                    'textLength': len(processed_text)
                }
                
                self.wfile.write(json.dumps(response).encode())
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_csv_path)
                except:
                    pass
                    
        except Exception as e:
            print(f"Error in word cloud generation: {str(e)}")
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                'success': False,
                'error': 'Failed to generate word cloud',
                'details': str(e),
                'dataSource': data_source if 'data_source' in locals() else 'unknown'
            }
            
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers() 