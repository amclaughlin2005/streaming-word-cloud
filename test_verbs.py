#!/usr/bin/env python3

import pandas as pd
import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag

# Common stop words to filter out
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

def test_verb_extraction():
    """Test verb extraction on sample data."""
    
    # Read the CSV file
    df = pd.read_csv('data/demo_feedback.csv')
    
    # Get first few questions to test
    sample_questions = df['Original Question'].head(3).tolist()
    
    print("=== TESTING VERB EXTRACTION ===")
    
    for i, question in enumerate(sample_questions, 1):
        print(f"\n--- Question {i} ---")
        print(f"Original: {question}")
        
        # Tokenize and tag
        tokens = word_tokenize(question)
        pos_tags = pos_tag(tokens)
        
        print("POS Tags:", pos_tags[:10])  # Show first 10 tags
        
        # Extract verbs
        verb_tags = {'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ'}
        verbs = [
            word.lower() for word, pos in pos_tags 
            if pos in verb_tags 
            and len(word) > 2
            and word.lower() not in STOP_WORDS
            and not word.isdigit()
            and word.isalpha()
        ]
        
        print(f"Extracted verbs: {verbs}")
        
        # Show all words for comparison
        all_words = [
            word.lower() for word in tokens
            if len(word) > 2
            and word.lower() not in STOP_WORDS
            and not word.isdigit()
            and word.isalpha()
        ]
        print(f"All filtered words: {all_words[:10]}...")  # Show first 10
        
        print(f"Verb count: {len(verbs)}, All words count: {len(all_words)}")

if __name__ == "__main__":
    test_verb_extraction()