#!/usr/bin/env python3

import os
import sys
import json
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
from wordcloud import WordCloud
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from collections import Counter
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag
from nltk.sentiment import SentimentIntensityAnalyzer
import io
import base64

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Download required NLTK data
def ensure_nltk_data():
    """Download required NLTK data packages if not already present."""
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    
    try:
        nltk.data.find('taggers/averaged_perceptron_tagger_eng')
    except LookupError:
        nltk.download('averaged_perceptron_tagger_eng', quiet=True)
    
    try:
        nltk.data.find('vader_lexicon')
    except LookupError:
        nltk.download('vader_lexicon', quiet=True)

# Initialize NLTK data on startup
ensure_nltk_data()

# Common stop words
STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
    'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how',
    'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so',
    'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time',
    'two', 'more', 'very', 'when', 'come', 'may', 'see', 'use', 'no',
    'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who',
    'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get', 'has',
    'made', 'over', 'where', 'much', 'your', 'way', 'well', 'water'
}

def get_default_verb_settings():
    """Return default verb extraction settings."""
    return {
        'include_base_verbs': True,
        'include_past_tense': True,
        'include_gerunds': True,
        'include_participles': True,
        'include_present_tense': True,
        'include_third_person': True,
        'include_modals': True,
        'min_word_length': 3,
        'custom_excludes': set()
    }

def extract_verbs(text, settings=None):
    """Extract only verbs from text using NLTK POS tagging."""
    if settings is None:
        settings = get_default_verb_settings()
    
    try:
        # Tokenize and get POS tags
        tokens = word_tokenize(text.lower())
        pos_tags = pos_tag(tokens)
        
        # Build verb tags set based on settings
        verb_tags = set()
        if settings.get('include_base_verbs', True):
            verb_tags.add('VB')
        if settings.get('include_past_tense', True):
            verb_tags.add('VBD')
        if settings.get('include_gerunds', True):
            verb_tags.add('VBG')
        if settings.get('include_participles', True):
            verb_tags.add('VBN')
        if settings.get('include_present_tense', True):
            verb_tags.add('VBP')
        if settings.get('include_third_person', True):
            verb_tags.add('VBZ')
        if settings.get('include_modals', True):
            verb_tags.add('MD')
        
        min_length = settings.get('min_word_length', 3)
        custom_excludes = settings.get('custom_excludes', set())
        
        verbs = []
        for word, pos in pos_tags:
            if pos in verb_tags:
                word_lower = word.lower()
                if (len(word_lower) >= min_length and 
                    word_lower not in STOP_WORDS and 
                    word_lower not in custom_excludes and
                    word_lower.isalpha()):
                    verbs.append(word_lower)
        
        print(f"Extracted {len(verbs)} verbs from text")
        return verbs
        
    except Exception as e:
        print(f"Error extracting verbs: {e}")
        return []

def process_text(text, verbs_only=False, settings=None):
    """Process text for word cloud generation."""
    if verbs_only:
        filtered_words = extract_verbs(text, settings)
        return ' '.join(filtered_words)
    else:
        # Standard text processing
        words = word_tokenize(text.lower())
        filtered_words = [
            word for word in words 
            if (word.isalpha() and 
                len(word) > 2 and 
                word not in STOP_WORDS)
        ]
        return ' '.join(filtered_words)

def generate_wordcloud_image(text, width=800, height=400):
    """Generate word cloud image and return as base64."""
    try:
        # Create word cloud
        wordcloud = WordCloud(
            width=width,
            height=height,
            background_color='white',
            max_words=100,
            relative_scaling=0.5,
            colormap='viridis'
        ).generate(text)
        
        # Create matplotlib figure
        plt.figure(figsize=(width/100, height/100))
        plt.imshow(wordcloud, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        
        # Save to bytes
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight', dpi=100, facecolor='white')
        plt.close()
        
        # Encode as base64
        img_buffer.seek(0)
        img_data = base64.b64encode(img_buffer.getvalue()).decode()
        
        return img_data
        
    except Exception as e:
        print(f"Error generating word cloud: {e}")
        return None

def analyze_sentiment_advanced(questions):
    """Advanced sentiment analysis using NLTK VADER."""
    try:
        sia = SentimentIntensityAnalyzer()
        
        sentiment_scores = {
            'positive': 0,
            'negative': 0,
            'neutral': 0,
            'compound_scores': []
        }
        
        for question in questions:
            scores = sia.polarity_scores(question)
            sentiment_scores['compound_scores'].append(scores['compound'])
            
            # Classify based on compound score
            if scores['compound'] >= 0.05:
                sentiment_scores['positive'] += 1
            elif scores['compound'] <= -0.05:
                sentiment_scores['negative'] += 1
            else:
                sentiment_scores['neutral'] += 1
        
        # Add statistics
        compound_scores = sentiment_scores['compound_scores']
        sentiment_scores['average_sentiment'] = sum(compound_scores) / len(compound_scores) if compound_scores else 0
        sentiment_scores['most_positive'] = max(compound_scores) if compound_scores else 0
        sentiment_scores['most_negative'] = min(compound_scores) if compound_scores else 0
        
        return sentiment_scores
        
    except Exception as e:
        print(f"Error in sentiment analysis: {e}")
        return None

def analyze_question_types_advanced(questions):
    """Advanced question type analysis with detailed categorization."""
    question_patterns = {
        'What': r'\bwhat\b',
        'How': r'\bhow\b',
        'Why': r'\bwhy\b',
        'When': r'\bwhen\b',
        'Where': r'\bwhere\b',
        'Who': r'\bwho\b',
        'Which': r'\bwhich\b',
        'Can/Could': r'\b(can|could)\b',
        'Should': r'\bshould\b',
        'Would': r'\bwould\b',
        'Is/Are': r'\b(is|are)\b',
        'Do/Does': r'\b(do|does|did)\b',
        'Will': r'\bwill\b',
        'Has/Have': r'\b(has|have|had)\b',
        'Other': r''
    }
    
    type_counts = Counter()
    total_questions = len(questions)
    
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
    
    # Convert to percentages
    result = {}
    for q_type, count in type_counts.items():
        result[q_type] = {
            'count': count,
            'percentage': round((count / total_questions) * 100, 1) if total_questions > 0 else 0
        }
    
    return result

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'wordcloud-ml'})

@app.route('/wordcloud', methods=['POST'])
def generate_wordcloud_endpoint():
    """Generate word cloud from questions."""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        verbs_only = data.get('verbs_only', False)
        settings = data.get('settings', {})
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        # Combine all questions
        all_text = ' '.join(questions)
        
        # Process text
        if verbs_only:
            processed_text = process_text(all_text, verbs_only=True, settings=settings)
        else:
            processed_text = process_text(all_text, verbs_only=False)
        
        if not processed_text.strip():
            return jsonify({'success': False, 'error': 'No processable text found'}), 400
        
        # Generate word cloud image
        img_data = generate_wordcloud_image(processed_text)
        
        if not img_data:
            return jsonify({'success': False, 'error': 'Failed to generate word cloud'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Word cloud generated successfully',
            'image_data': img_data,
            'mode': 'verbs' if verbs_only else 'all',
            'text_length': len(processed_text),
            'word_count': len(processed_text.split())
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/sentiment', methods=['POST'])
def sentiment_analysis_endpoint():
    """Perform sentiment analysis on questions."""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        sentiment_data = analyze_sentiment_advanced(questions)
        
        if not sentiment_data:
            return jsonify({'success': False, 'error': 'Sentiment analysis failed'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Sentiment analysis completed',
            'data': sentiment_data,
            'analysis': 'sentiment'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/question-types', methods=['POST'])
def question_types_endpoint():
    """Analyze question types."""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        types_data = analyze_question_types_advanced(questions)
        
        return jsonify({
            'success': True,
            'message': 'Question types analysis completed',
            'data': types_data,
            'analysis': 'question-types'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    """Unified analysis endpoint supporting multiple analysis types."""
    try:
        data = request.get_json()
        analysis_type = data.get('type', 'wordcloud')
        questions = data.get('questions', [])
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        if analysis_type == 'wordcloud':
            return generate_wordcloud_endpoint()
        elif analysis_type == 'sentiment':
            return sentiment_analysis_endpoint()
        elif analysis_type == 'question-types':
            return question_types_endpoint()
        else:
            return jsonify({'success': False, 'error': f'Unknown analysis type: {analysis_type}'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False) 