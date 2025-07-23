#!/usr/bin/env python3

import os
import sys
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add the parent directory to sys.path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our existing wordcloud generation functions
try:
    from generate_wordcloud import (
        load_and_process_csv, 
        generate_wordcloud, 
        generate_question_types_bar_chart,
        generate_sentiment_bar_chart,
        ensure_nltk_data
    )
except ImportError as e:
    print(f"Import error: {e}")

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Ensure NLTK data is available
        ensure_nltk_data()
        
        # Parse the URL and query parameters
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)
        
        # Get CSV file path from environment
        csv_path = os.environ.get('CSV_FILE_PATH', 'data/demo_feedback.csv')
        
        try:
            # Determine the mode based on query parameters
            if 'sentiment' in query_params and query_params['sentiment'][0] == 'true':
                # Sentiment analysis mode
                sentiment_counts = load_and_process_csv(csv_path, False, False, True, None)
                output_file = '/tmp/wordcloud_sentiment.png'
                success = generate_sentiment_bar_chart(sentiment_counts, output_file)
                mode = 'sentiment'
            elif 'question-types' in query_params and query_params['question-types'][0] == 'true':
                # Question types analysis mode
                question_counts = load_and_process_csv(csv_path, False, True, False, None)
                output_file = '/tmp/wordcloud_question_types.png'
                success = generate_question_types_bar_chart(question_counts, output_file)
                mode = 'question-types'
            elif 'verbs' in query_params and query_params['verbs'][0] == 'true':
                # Verbs only mode
                processed_text = load_and_process_csv(csv_path, True, False, False, None)
                output_file = '/tmp/wordcloud_verbs.png'
                success = generate_wordcloud(processed_text, output_file)
                mode = 'verbs'
            else:
                # All words mode (default)
                processed_text = load_and_process_csv(csv_path, False, False, False, None)
                output_file = '/tmp/wordcloud_all.png'
                success = generate_wordcloud(processed_text, output_file)
                mode = 'all'
            
            if success:
                # Read the generated image file
                with open(output_file, 'rb') as f:
                    image_data = f.read()
                
                # Return the image
                self.send_response(200)
                self.send_header('Content-Type', 'image/png')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(image_data)
            else:
                # Return error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'Failed to generate {mode} visualization'
                })
                self.wfile.write(error_response.encode())
                
        except Exception as e:
            # Return error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({
                'error': f'Server error: {str(e)}'
            })
            self.wfile.write(error_response.encode())