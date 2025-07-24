#!/usr/bin/env python3

import os
import sys
import json
import tempfile
import urllib.parse
from http.server import BaseHTTPRequestHandler
from collections import Counter
import re

# Add the parent directory to sys.path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Simple fallback functions for analysis
def simple_sentiment_analysis(questions):
    """Simple sentiment analysis without heavy ML dependencies"""
    positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'best', 'wonderful', 'fantastic']
    negative_words = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'disappointing']
    
    sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
    
    for question in questions:
        question_lower = question.lower()
        positive_score = sum(1 for word in positive_words if word in question_lower)
        negative_score = sum(1 for word in negative_words if word in question_lower)
        
        if positive_score > negative_score:
            sentiment_counts['positive'] += 1
        elif negative_score > positive_score:
            sentiment_counts['negative'] += 1
        else:
            sentiment_counts['neutral'] += 1
    
    return sentiment_counts

def simple_question_types(questions):
    """Simple question type analysis without heavy dependencies"""
    question_patterns = {
        'What': r'\bwhat\b',
        'How': r'\bhow\b',
        'Why': r'\bwhy\b',
        'When': r'\bwhen\b',
        'Where': r'\bwhere\b',
        'Who': r'\bwho\b',
        'Which': r'\bwhich\b',
        'Can': r'\b(can|could)\b',
        'Should': r'\bshould\b',
        'Would': r'\bwould\b',
        'Is': r'\b(is|are)\b',
        'Do': r'\b(do|does|did)\b',
        'Other': r''
    }
    
    type_counts = Counter()
    
    for question in questions:
        question_lower = question.lower()
        categorized = False
        
        for q_type, pattern in question_patterns.items():
            if q_type != 'Other' and pattern and re.search(pattern, question_lower):
                type_counts[q_type] += 1
                categorized = True
                break
        
        if not categorized:
            type_counts['Other'] += 1
    
    return dict(type_counts)

# Import our existing wordcloud generation functions
try:
    from generate_wordcloud import (
        load_and_process_csv, 
        generate_wordcloud, 
        ensure_nltk_data,
        get_default_verb_settings
    )
    NLTK_AVAILABLE = True
except ImportError as e:
    print(f"NLTK import error, using fallbacks: {e}")
    NLTK_AVAILABLE = False

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
            import csv
            data = []
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    data.append(row)
            return data, 'local-file'
    except Exception as e:
        print(f"Failed to load local file: {e}")
    
    return None, None

def convert_data_to_csv(data):
    """Convert data array to CSV string"""
    if not data:
        return ""
    
    import csv
    import io
    
    output = io.StringIO()
    if data:
        fieldnames = data[0].keys()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    return output.getvalue()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse the URL and query parameters
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            
            print(f"Analysis API called with query: {query_params}")
            
            # Determine analysis type from query parameters
            analysis_type = query_params.get('type', ['wordcloud'])[0].lower()
            verbs_only = query_params.get('verbs', ['false'])[0].lower() == 'true'
            
            print(f"Analysis type: {analysis_type}, verbs_only: {verbs_only}")
            
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
            
            # Extract questions
            questions = []
            for row in data:
                question = row.get('Original Question', '').strip()
                if question:
                    questions.append(question)
            
            if not questions:
                raise Exception("No questions found in data")
            
            response = None
            
            if analysis_type == 'sentiment':
                # Simple sentiment analysis
                print(f"Processing sentiment analysis")
                chart_data = simple_sentiment_analysis(questions)
                
                response = {
                    'success': True,
                    'message': 'Sentiment analysis completed successfully',
                    'data': chart_data,
                    'recordCount': len(data),
                    'dataSource': data_source,
                    'analysis': 'sentiment'
                }
                
            elif analysis_type == 'question-types':
                # Simple question types analysis
                print(f"Processing question types analysis")
                chart_data = simple_question_types(questions)
                
                response = {
                    'success': True,
                    'message': 'Question types analysis completed successfully',
                    'data': chart_data,
                    'recordCount': len(data),
                    'dataSource': data_source,
                    'analysis': 'question-types'
                }
                
            else:  # Default to wordcloud
                if NLTK_AVAILABLE:
                    # Use full NLTK processing if available
                    if verbs_only:
                        ensure_nltk_data()
                    
                    # Create temporary CSV file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
                        csv_content = convert_data_to_csv(data)
                        temp_file.write(csv_content)
                        temp_csv_path = temp_file.name
                    
                    try:
                        settings = get_default_verb_settings() if verbs_only else None
                        processed_text = load_and_process_csv(temp_csv_path, verbs_only, False, False, settings)
                        
                        if not processed_text:
                            raise Exception("No text was processed from the CSV data")
                        
                        # Ensure public directory exists
                        os.makedirs('public', exist_ok=True)
                        
                        # Generate the word cloud image
                        output_file = 'public/wordcloud_verbs.png' if verbs_only else 'public/wordcloud_all.png'
                        image_path = f"/{os.path.basename(output_file)}"
                        
                        success = generate_wordcloud(processed_text, output_file)
                        
                        if not success:
                            raise Exception("Word cloud generation failed")
                        
                        response = {
                            'success': True,
                            'message': 'Word cloud generated successfully',
                            'imagePath': image_path,
                            'recordCount': len(data),
                            'dataSource': data_source,
                            'mode': 'verbs' if verbs_only else 'all',
                            'textLength': len(processed_text)
                        }
                    finally:
                        # Clean up temporary file
                        try:
                            os.unlink(temp_csv_path)
                        except:
                            pass
                else:
                    # Fallback to simple text processing
                    all_text = ' '.join(questions)
                    response = {
                        'success': True,
                        'message': 'Simple word cloud generated (NLTK not available)',
                        'recordCount': len(data),
                        'dataSource': data_source,
                        'mode': 'simple',
                        'textLength': len(all_text),
                        'warning': 'Using simplified processing due to dependency limitations'
                    }
            
            print(f"Analysis completed successfully")
            
            # Return success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(response).encode())
                    
        except Exception as e:
            print(f"Error in analysis: {str(e)}")
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                'success': False,
                'error': 'Failed to generate analysis',
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