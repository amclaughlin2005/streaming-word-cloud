#!/usr/bin/env python3

import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from nltk.sentiment import SentimentIntensityAnalyzer

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Download required NLTK data
def ensure_nltk_data():
    """Download required NLTK data packages."""
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
    'to', 'was', 'were', 'will', 'with', 'this', 'but', 'they',
    'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how',
    'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so'
}

def extract_verbs(text):
    """Extract verbs using NLTK POS tagging."""
    try:
        tokens = word_tokenize(text.lower())
        pos_tags = pos_tag(tokens)
        
        verb_tags = {'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'MD'}
        
        verbs = []
        for word, pos in pos_tags:
            if pos in verb_tags and len(word) > 2 and word not in STOP_WORDS:
                verbs.append(word.lower())
        
        return verbs
    except Exception as e:
        print(f"Error extracting verbs: {e}")
        return []

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
            
            if scores['compound'] >= 0.05:
                sentiment_scores['positive'] += 1
            elif scores['compound'] <= -0.05:
                sentiment_scores['negative'] += 1
            else:
                sentiment_scores['neutral'] += 1
        
        # Add statistics
        compound_scores = sentiment_scores['compound_scores']
        sentiment_scores['average_sentiment'] = sum(compound_scores) / len(compound_scores) if compound_scores else 0
        
        return sentiment_scores
    except Exception as e:
        print(f"Error in sentiment analysis: {e}")
        return None

def analyze_question_types_advanced(questions):
    """Advanced question type analysis."""
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
    return jsonify({'status': 'healthy', 'service': 'wordcloud-ml-light'})

@app.route('/wordcloud', methods=['POST'])
def generate_wordcloud_endpoint():
    """Generate word frequency data (no image generation)."""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        verbs_only = data.get('verbs_only', False)
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        all_text = ' '.join(questions)
        
        if verbs_only:
            words = extract_verbs(all_text)
        else:
            tokens = word_tokenize(all_text.lower())
            words = [w for w in tokens if w.isalpha() and len(w) > 2 and w not in STOP_WORDS]
        
        # Count word frequencies
        word_freq = Counter(words)
        top_words = dict(word_freq.most_common(50))
        
        return jsonify({
            'success': True,
            'message': 'Word analysis completed',
            'data': top_words,
            'mode': 'verbs' if verbs_only else 'all',
            'word_count': len(words),
            'unique_words': len(set(words))
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/sentiment', methods=['POST'])
def sentiment_analysis_endpoint():
    """Perform sentiment analysis."""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        
        if not questions:
            return jsonify({'success': False, 'error': 'No questions provided'}), 400
        
        sentiment_data = analyze_sentiment_advanced(questions)
        
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False) 