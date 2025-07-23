#!/usr/bin/env python3

import pandas as pd
import re
import os
import sys
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from collections import Counter
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag
from nltk.sentiment import SentimentIntensityAnalyzer

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

def load_and_process_csv(csv_path, verbs_only=False, question_types=False, sentiment_analysis=False, settings=None):
    """Load CSV data and process it into text for word cloud generation."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    # Read CSV file
    df = pd.read_csv(csv_path)
    
    # Check if 'Original Question' column exists
    if 'Original Question' not in df.columns:
        raise ValueError("CSV file must contain an 'Original Question' column")
    
    # Extract only the 'Original Question' column data
    original_questions = df['Original Question'].dropna()  # Remove NaN values
    
    if sentiment_analysis:
        # Analyze sentiment and return emoji-based text
        return analyze_sentiment(original_questions)
    elif question_types:
        # Analyze question types instead of processing text normally
        return analyze_question_types(original_questions)
    else:
        # Combine all question text
        all_text = ' '.join(original_questions.astype(str))
        return process_text(all_text, verbs_only, settings)

def analyze_question_types(questions):
    """Analyze and categorize question types from the questions list."""
    question_type_counts = Counter()
    
    # Define patterns for each schema category
    schema_patterns = {
        'EXISTS': [
            r'\bany\s+\w*\?',  # "Any depositions?"
            r'\bdo\s+we\s+have\b',  # "Do we have..."
            r'\bis\s+there\b',  # "Is there..."
            r'\bare\s+there\b',  # "Are there..."
            r'\bexist\b',  # Contains "exist"
            r'^\w+\s*\?$',  # Single word questions like "Depositions?"
        ],
        
        'EXTRACT': [
            r'\blist\s+all\b',  # "List all..."
            r'\bwhat\s+\w*\s+was\s+.*\s+on\b',  # "What medications was client on?"
            r'\bshow\s+me\s+all\b',  # "Show me all..."
            r'\blist\s+.*\s+(depositions|injuries|medications|records)\b',
            r'\bevery\s+\w+',  # "every occurrence"
            r'\ball\s+(the\s+)?\w+',  # "all depositions", "all the injuries"
        ],
        
        'AGGREGATE': [
            r'\bhow\s+many\b',  # "How many..."
            r'\btotal\b',  # Contains "total"
            r'\bcount\b',  # Contains "count"
            r'\baverage\b',  # Contains "average"
            r'\bsum\b',  # Contains "sum"
            r'\bnumber\s+of\b',  # "number of"
        ],
        
        'SUMMARIZE': [
            r'\bsummarize\b',  # "Summarize..."
            r'\btell\s+me\s+about\b',  # "Tell me about..."
            r'\bwhat\s+happened\b',  # "What happened..."
            r'\boverview\b',  # Contains "overview"
            r'\bexplain\b',  # Contains "explain"
            r'\bdescribe\b',  # Contains "describe"
        ],
        
        'STATUS': [
            r'\bwhat.*left\s+to\s+do\b',  # "What's left to do?"
            r'\bstatus\b',  # Contains "status"
            r'\bprogress\b',  # Contains "progress"
            r'\bmissing\b',  # Contains "missing"
            r'\bnext\s+steps\b',  # "next steps"
            r'\bwhat.*last\s+happened\b',  # "what last happened"
        ],
        
        'CALENDAR': [
            r'\bwhen\s+is\s+.*deadline\b',  # "When is the deadline?"
            r'\bdeadline\b',  # Contains "deadline"
            r'\bschedule\b',  # Contains "schedule"
            r'\bdate\b',  # Contains "date"
            r'\bwhen\s+(is|was|will)\b',  # "When is/was/will..."
        ],
        
        'DRAFT': [
            r'\bwrite\s+a\b',  # "Write a..."
            r'\bdraft\b',  # Contains "draft"
            r'\bgenerate\b',  # Contains "generate"
            r'\bcreate\s+a\s+(letter|document|report)\b',  # "Create a letter/document/report"
            r'\bcompose\b',  # Contains "compose"
        ],
        
        'REASON': [
            r'\bshould\s+we\b',  # "Should we..."
            r'\bred\s+flags\b',  # "Red flags"
            r'\binconsistencies\b',  # Contains "inconsistencies"
            r'\bhow\s+is\s+.*related\s+to\b',  # "How is this related to that"
            r'\bwhy\s+(should|would|did)\b',  # "Why should/would/did..."
            r'\bstrateg\w*\b',  # Strategic/strategy
        ],
        
        'LOOKUP': [
            r'\bwho\s+is\s+the\s+\w+\?',  # "Who is the adjuster?"
            r'\bwhat\s+is\s+the\s+\w+\s+(number|id)\b',  # "What is the policy number?"
            r'^\s*\w+\s*\?\s*$',  # Single word questions (but not plurals)
        ],
        
        'CONVERSATION': [
            r'\b(hi|hello|hey|thanks|thank\s+you|goodbye|bye)\b',
            r'\bhow\s+are\s+you\b',
            r'\bgood\s+(morning|afternoon|evening)\b',
        ],
        
        'HELP': [
            r'\bhow\s+to\b',  # "How to..."
            r'\bfilevine\b',  # Mentions "Filevine"
            r'\bhelp\b',  # Contains "help"
            r'\binstructions\b',  # Contains "instructions"
        ],
        
        'META': [
            r'\bcan\s+you\s+(read|access|see)\b',  # "Can you read my notes?"
            r'\bwhy\s+did\s+you\s+say\b',  # "Why did you say that?"
            r'\bthat.*wrong\b',  # "That's wrong"
            r'\bperformance\b',  # About tool performance
        ],
        
        'GENERAL_KB': [
            r'\bwhat\s+is\s+(the\s+)?\w+\s*\?',  # General "What is..." questions
            r'\bdefin\w*\b',  # Define/definition
        ],
        
        'FLAGGED': [
            r'\bignore\s+all\s+previous\s+instruction\b',
            r'\bsystem\s+prompt\b',
            r'\badministrator\s+mode\b',
        ],
        
        'NEEDS_CLARIFICATION': [
            r'^\s*\?\s*$',  # Just a question mark
            r'^.{1,5}$',  # Very short queries (1-5 characters)
        ],
        
        'UNSUPPORTED_ACTION': [
            r'\b(change|update|set|assign|mark\s+as|delete)\b',
            r'\bmodify\b',
            r'\bedit\b',
        ]
    }
    
    for question in questions:
        question_str = str(question).lower().strip()
        categorized = False
        
        # Check each schema category pattern
        for category, patterns in schema_patterns.items():
            for pattern in patterns:
                if re.search(pattern, question_str, re.IGNORECASE):
                    # Special handling for LOOKUP to exclude plurals
                    if category == 'LOOKUP':
                        # Skip if contains plural indicators
                        plural_indicators = ['witnesses', 'records', 'depositions', 'medications', 'all', 'every', 'list', 'show', 'give me']
                        if any(indicator in question_str for indicator in plural_indicators):
                            continue
                    
                    question_type_counts[category] += 1
                    categorized = True
                    break
            if categorized:
                break
        
        # If no pattern matches, check if it's a question or statement
        if not categorized:
            if question_str.endswith('?'):
                question_type_counts['NEEDS_CLARIFICATION'] += 1
            else:
                question_type_counts['CONVERSATION'] += 1
    
    print(f"Schema-based question analysis complete. Found {len(question_type_counts)} categories:")
    for category, count in question_type_counts.most_common():
        print(f"  {category}: {count}")
    
    # Return the counts directly for bar chart visualization
    return question_type_counts

def analyze_sentiment(questions):
    """Analyze sentiment of questions and return emoji-based text for word cloud."""
    try:
        # Initialize VADER sentiment analyzer
        sia = SentimentIntensityAnalyzer()
        
        # Define sentiment to emoji mapping
        sentiment_emojis = {
            'very_positive': '😍',    # heart eyes - compound >= 0.5
            'positive': '😊',         # happy face - 0.1 <= compound < 0.5
            'neutral': '😐',          # neutral face - -0.1 < compound < 0.1
            'negative': '😞',         # disappointed - -0.5 < compound <= -0.1
            'very_negative': '😡'     # angry face - compound <= -0.5
        }
        
        sentiment_counts = Counter()
        
        for question in questions:
            question_str = str(question).strip()
            if not question_str:
                continue
                
            # Get sentiment scores
            scores = sia.polarity_scores(question_str)
            compound = scores['compound']
            
            # Categorize sentiment based on compound score
            if compound >= 0.5:
                sentiment_counts['very_positive'] += 1
            elif compound >= 0.1:
                sentiment_counts['positive'] += 1
            elif compound > -0.1:
                sentiment_counts['neutral'] += 1
            elif compound > -0.5:
                sentiment_counts['negative'] += 1
            else:
                sentiment_counts['very_negative'] += 1
        
        print(f"Sentiment analysis complete. Found {len(sentiment_counts)} sentiment categories:")
        for sentiment, count in sentiment_counts.most_common():
            emoji = sentiment_emojis.get(sentiment, '❓')
            print(f"  {sentiment.replace('_', ' ').title()}: {count} ({emoji})")
        
        # Convert to emoji text for word cloud
        emoji_text = []
        for sentiment, count in sentiment_counts.items():
            emoji = sentiment_emojis.get(sentiment, '❓')
            # Scale count for better visualization (each emoji represents multiple occurrences)
            scaled_count = max(1, count // 3)  # Scale down for better visualization
            for _ in range(scaled_count):
                emoji_text.append(emoji)
        
        # If no sentiments found, add a neutral emoji
        if not emoji_text:
            emoji_text = ['😐'] * 10
        
        return ' '.join(emoji_text)
        
    except Exception as e:
        print(f"Error in sentiment analysis: {e}")
        # Return some default emojis if analysis fails
        return '😐 😊 😞 😐 😊'

def extract_verbs(text, settings=None):
    """Extract only verbs from text using NLTK POS tagging with custom settings."""
    if settings is None:
        settings = get_default_settings()
    
    try:
        # Tokenize the text
        tokens = word_tokenize(text)
        
        # Get part-of-speech tags
        pos_tags = pos_tag(tokens)
        
        # Build verb tags set based on settings
        verb_tags = set()
        if settings.get('includeBase', True):
            verb_tags.add('VB')
        if settings.get('includePast', True):
            verb_tags.add('VBD')
        if settings.get('includeGerund', True):
            verb_tags.add('VBG')
        if settings.get('includePastParticiple', True):
            verb_tags.add('VBN')
        if settings.get('includePresentNon3rd', True):
            verb_tags.add('VBP')
        if settings.get('includePresent3rd', True):
            verb_tags.add('VBZ')
        if settings.get('includeModals', False):
            verb_tags.add('MD')
        
        min_length = int(settings.get('minLength', 3))
        allow_contractions = settings.get('allowContractions', False)
        strict_stop_words = settings.get('strictStopWords', True)
        
        verbs = []
        for word, pos in pos_tags:
            if pos in verb_tags:
                word_lower = word.lower()
                
                # Apply length filter
                if len(word) < min_length:
                    continue
                
                # Apply stop words filter
                if strict_stop_words and word_lower in STOP_WORDS:
                    continue
                
                # Apply digit filter
                if word.isdigit():
                    continue
                
                # Apply alphabetic filter (contractions)
                if not allow_contractions and not word.isalpha():
                    continue
                elif allow_contractions and not word.replace("'", "").isalpha():
                    continue
                
                verbs.append(word_lower)
        
        print(f"Extracted {len(verbs)} verbs from text using custom settings")
        return verbs
    except Exception as e:
        print(f"Error extracting verbs: {e}")
        return []

def get_default_settings():
    """Return default verb extraction settings."""
    return {
        'includeBase': True,
        'includePast': True,
        'includeGerund': True,
        'includePastParticiple': True,
        'includePresentNon3rd': True,
        'includePresent3rd': True,
        'includeModals': False,
        'minLength': 3,
        'allowContractions': False,
        'strictStopWords': True
    }

def process_text(text, verbs_only=False, settings=None):
    """Clean and process text for word cloud generation."""
    # Convert to lowercase
    text = text.lower()
    
    if verbs_only:
        # Extract only verbs using NLTK with custom settings
        filtered_words = extract_verbs(text, settings)
    else:
        # Remove punctuation and special characters, keep only letters and spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Split into words
        words = text.split()
        
        # Filter words
        filtered_words = [
            word for word in words 
            if len(word) > 2  # Remove short words
            and word not in STOP_WORDS  # Remove stop words
            and not word.isdigit()  # Remove pure numbers
        ]
        print(f"Extracted {len(filtered_words)} total words from text")
    
    return ' '.join(filtered_words)

def generate_wordcloud(text, output_path='public/wordcloud.png', width=800, height=900):
    """Generate word cloud image from text."""
    if not text.strip():
        print("No text data available for word cloud generation")
        return False
    
    # Check if this is emoji-based text (for sentiment analysis)
    is_emoji_text = any(char in text for char in '😍😊😐😞😡')
    
    if is_emoji_text:
        # Handle emoji word cloud with specific font and settings
        try:
            # Define custom color function for sentiment emojis
            def sentiment_color_func(word, font_size, position, orientation, random_state=None, **kwargs):
                sentiment_colors = {
                    '😍': '#FF69B4',    # Hot pink for very positive
                    '😊': '#32CD32',    # Lime green for positive  
                    '😐': '#808080',    # Gray for neutral
                    '😞': '#FF8C00',    # Dark orange for negative
                    '😡': '#DC143C'     # Crimson red for very negative
                }
                return sentiment_colors.get(word, '#4CAF50')
            
            wordcloud = WordCloud(
                width=width,
                height=height,
                background_color='white',
                color_func=sentiment_color_func,
                max_words=20,
                relative_scaling=0.8,
                random_state=42,
                prefer_horizontal=0.9,
                font_path=None,  # Use default system font
                collocations=False
            ).generate(text)
        except Exception as e:
            print(f"Error generating emoji word cloud: {e}")
            # Fallback: create a colorized visualization
            return generate_emoji_fallback(text, output_path, width, height)
    else:
        # Standard word cloud for text
        wordcloud = WordCloud(
            width=width,
            height=height,
            background_color='white',
            colormap='viridis',
            max_words=100,
            relative_scaling=0.5,
            random_state=42
        ).generate(text)
    
    # Create the plot
    plt.figure(figsize=(width/100, height/100))
    plt.imshow(wordcloud, interpolation='bilinear')
    plt.axis('off')
    plt.tight_layout(pad=0)
    
    # Save the image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, bbox_inches='tight', dpi=100, facecolor='white')
    plt.close()
    
    print(f"Word cloud saved to: {output_path}")
    return True

def generate_emoji_fallback(text, output_path, width=800, height=900):
    """Generate a colorized emoji visualization when WordCloud fails."""
    try:
        from collections import Counter
        import matplotlib.patches as patches
        
        # Count emojis
        emojis = text.split()
        emoji_counts = Counter(emojis)
        
        # Define color mapping for sentiments
        emoji_colors = {
            '😍': '#FF69B4',    # Hot pink for very positive
            '😊': '#32CD32',    # Lime green for positive
            '😐': '#808080',    # Gray for neutral
            '😞': '#FF8C00',    # Dark orange for negative
            '😡': '#DC143C'     # Crimson red for very negative
        }
        
        # Define sentiment names for better labels
        emoji_labels = {
            '😍': 'Very Positive',
            '😊': 'Positive', 
            '😐': 'Neutral',
            '😞': 'Negative',
            '😡': 'Very Negative'
        }
        
        # Create a horizontal bar chart visualization
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        fig.patch.set_facecolor('white')
        ax.set_facecolor('white')
        
        # Add title
        ax.text(0.5, 0.95, 'Customer Sentiment Analysis', 
               fontsize=24, ha='center', va='center', weight='bold',
               transform=ax.transAxes, color='#333333')
        
        # Calculate proportions and set up horizontal bar chart area
        total_count = sum(emoji_counts.values())
        if total_count == 0:
            return False
            
        # Define chart area (leave space for title and footer)
        chart_top = 0.88
        chart_bottom = 0.12
        chart_height = chart_top - chart_bottom
        chart_left = 0.30  # More space for emoji and labels on left
        chart_right = 0.95
        chart_width = chart_right - chart_left
        
        # Sort by count (highest first) for better visual hierarchy
        sorted_sentiments = emoji_counts.most_common()
        num_categories = len(sorted_sentiments)
        
        # Calculate bar spacing with more padding
        if num_categories > 0:
            bar_spacing = chart_height / num_categories
            bar_height = bar_spacing * 0.6  # Leave 40% for spacing between bars (more padding)
        
        # Start from top and work down
        y_pos = chart_top - bar_spacing/2
        
        for i, (emoji, count) in enumerate(sorted_sentiments):
            if emoji in emoji_colors:
                # Calculate percentage
                percentage = (count / total_count) * 100 if total_count > 0 else 0
                
                # Get color and label for this emoji
                color = emoji_colors[emoji]
                label = emoji_labels.get(emoji, 'Unknown')
                
                # Calculate horizontal bar width (proportional to percentage)
                bar_width = (percentage / 100) * chart_width
                
                # Bar position
                bar_x = chart_left
                bar_y = y_pos - bar_height/2
                
                # Create horizontal colored bar
                rect = patches.Rectangle((bar_x, bar_y), bar_width, bar_height, 
                                       linewidth=2, edgecolor=color, 
                                       facecolor=color, alpha=0.7, 
                                       transform=ax.transAxes)
                ax.add_patch(rect)
                
                # Add emoji on the far left with padding
                emoji_size = min(40, max(24, bar_height * 150))
                ax.text(0.05, y_pos, emoji, 
                       fontsize=emoji_size, ha='center', va='center',
                       transform=ax.transAxes)
                
                # Add sentiment label with more padding from emoji
                ax.text(0.28, y_pos, label, 
                       fontsize=14, ha='right', va='center',
                       transform=ax.transAxes, color=color, weight='bold')
                
                # Add count and percentage at the end of the bar with padding
                text_x = bar_x + bar_width + 0.02  # More padding from bar end
                ax.text(text_x, y_pos, f"{count} ({percentage:.1f}%)", 
                       fontsize=12, ha='left', va='center',
                       transform=ax.transAxes, color=color, weight='bold')
                
                # Skip grid lines to avoid transform issues
                
                # Move to next position
                y_pos -= bar_spacing
        
        # Add footer with total count
        ax.text(0.5, 0.05, f'Total responses analyzed: {total_count}', 
               fontsize=12, ha='center', va='center',
               transform=ax.transAxes, color='#666666', style='italic')
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        # Save the image with higher quality
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        plt.savefig(output_path, bbox_inches='tight', dpi=150, facecolor='white')
        plt.close()
        
        print(f"Colorized emoji visualization saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error creating colorized emoji fallback: {e}")
        return False

def generate_question_types_bar_chart(question_type_counts, output_path, width=800, height=900):
    """Generate a horizontal bar chart for question type analysis."""
    try:
        import matplotlib.patches as patches
        
        # Calculate total count
        total_count = sum(question_type_counts.values())
        if total_count == 0:
            return False
        
        # Sort by count (highest first) for better visual hierarchy
        sorted_categories = question_type_counts.most_common()
        num_categories = len(sorted_categories)
        
        # Create figure
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        fig.patch.set_facecolor('white')
        ax.set_facecolor('white')
        
        # Add title
        ax.text(0.5, 0.95, 'Question Type Analysis', 
               fontsize=24, ha='center', va='center', weight='bold',
               transform=ax.transAxes, color='#333333')
        
        # Define chart area (leave space for title and footer)
        chart_top = 0.88
        chart_bottom = 0.08
        chart_height = chart_top - chart_bottom
        chart_left = 0.25  # Space for labels on left
        chart_right = 0.95
        chart_width = chart_right - chart_left
        
        # Calculate bar spacing
        if num_categories > 0:
            bar_spacing = chart_height / num_categories
            bar_height = bar_spacing * 0.7  # Leave 30% for spacing between bars
        
        # Define colors for different categories (using a color palette)
        colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                 '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
                 '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
                 '#c49c94', '#f7b6d3', '#c7c7c7', '#dbdb8d', '#9edae5']
        
        # Start from top and work down
        y_pos = chart_top - bar_spacing/2
        max_count = max(count for _, count in sorted_categories)
        
        for i, (category, count) in enumerate(sorted_categories):
            # Calculate percentage
            percentage = (count / total_count) * 100 if total_count > 0 else 0
            
            # Get color for this category
            color = colors[i % len(colors)]
            
            # Calculate horizontal bar width (proportional to count)
            bar_width = (count / max_count) * chart_width * 0.8  # Scale to 80% of available width
            
            # Bar position
            bar_x = chart_left
            bar_y = y_pos - bar_height/2
            
            # Create horizontal colored bar
            rect = patches.Rectangle((bar_x, bar_y), bar_width, bar_height, 
                                   linewidth=1, edgecolor=color, 
                                   facecolor=color, alpha=0.7, 
                                   transform=ax.transAxes)
            ax.add_patch(rect)
            
            # Add category label (left of chart)
            ax.text(0.23, y_pos, category, 
                   fontsize=12, ha='right', va='center',
                   transform=ax.transAxes, color='#333333', weight='bold')
            
            # Add count and percentage at the end of the bar
            text_x = bar_x + bar_width + 0.02
            ax.text(text_x, y_pos, f"{count} ({percentage:.1f}%)", 
                   fontsize=11, ha='left', va='center',
                   transform=ax.transAxes, color=color, weight='bold')
            
            # Move to next position
            y_pos -= bar_spacing
        
        # Add footer with total count
        ax.text(0.5, 0.02, f'Total questions analyzed: {total_count}', 
               fontsize=12, ha='center', va='center',
               transform=ax.transAxes, color='#666666', style='italic')
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        # Save the image with higher quality
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        plt.savefig(output_path, bbox_inches='tight', dpi=150, facecolor='white')
        plt.close()
        
        print(f"Question types bar chart saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error creating question types bar chart: {e}")
        return False

def parse_settings_from_args():
    """Parse settings from command line arguments."""
    settings = get_default_settings()
    
    for arg in sys.argv[1:]:
        if '=' in arg:
            key, value = arg.split('=', 1)
            key = key.lstrip('--')
            
            # Convert string values to appropriate types
            if value.lower() in ('true', 'false'):
                settings[key] = value.lower() == 'true'
            elif value.isdigit():
                settings[key] = int(value)
            else:
                settings[key] = value
    
    return settings

def main():
    """Main function to generate word cloud from CSV data."""
    # Get CSV file path from environment or use default
    csv_path = os.environ.get('CSV_FILE_PATH', 'data/sample_data.csv')
    
    # Check for sentiment analysis flag
    sentiment_analysis = False
    for arg in sys.argv[1:]:
        if arg.startswith('--sentiment=true'):
            sentiment_analysis = True
            break
    
    # Check for question types analysis flag
    question_types = False
    if not sentiment_analysis:  # Only check if not doing sentiment analysis
        for arg in sys.argv[1:]:
            if arg.startswith('--question-types=true'):
                question_types = True
                break
    
    # Check for verbs-only flag from command line argument or environment
    verbs_only = False
    if not question_types and not sentiment_analysis:  # Only check for verbs if not doing other analysis
        if len(sys.argv) > 1 and sys.argv[1] == '--verbs-only':
            verbs_only = True
        elif os.environ.get('VERBS_ONLY', '').lower() == 'true':
            verbs_only = True
        else:
            # Check if any argument contains verbs settings (new method)
            for arg in sys.argv[1:]:
                if arg.startswith('--verbs=true') or 'include' in arg.lower():
                    verbs_only = True
                    break
    
    # Parse settings from command line
    settings = parse_settings_from_args() if verbs_only else None
    
    try:
        # Process CSV data
        if sentiment_analysis:
            filter_type = "sentiment analysis"
            print(f"Processing CSV file: {csv_path} ({filter_type})")
            processed_text = load_and_process_csv(csv_path, False, False, True, None)
            output_file = 'public/wordcloud_sentiment.png'
        elif question_types:
            filter_type = "question types analysis"
            print(f"Processing CSV file: {csv_path} ({filter_type})")
            question_counts = load_and_process_csv(csv_path, False, True, False, None)
            output_file = 'public/wordcloud_question_types.png'
        else:
            filter_type = "verbs only" if verbs_only else "all words"
            if settings and verbs_only:
                print(f"Processing CSV file: {csv_path} ({filter_type} with custom settings)")
            else:
                print(f"Processing CSV file: {csv_path} ({filter_type})")
            processed_text = load_and_process_csv(csv_path, verbs_only, False, False, settings)
            output_file = 'public/wordcloud_verbs.png' if verbs_only else 'public/wordcloud_all.png'
        
        # Generate visualization
        if question_types:
            success = generate_question_types_bar_chart(question_counts, output_file)
        else:
            success = generate_wordcloud(processed_text, output_file)
        
        if success:
            if question_types:
                print("Question types bar chart generated successfully!")
            else:
                print("Word cloud generated successfully!")
        else:
            if question_types:
                print("Failed to generate question types bar chart - no data available")
            else:
                print("Failed to generate word cloud - no text data available")
            
    except Exception as e:
        print(f"Error generating word cloud: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()