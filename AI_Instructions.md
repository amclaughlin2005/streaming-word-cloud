# AI Instructions - Streaming Word Cloud App

## 📋 Project Overview

This is a **Node.js web application** that creates real-time word cloud visualizations from local CSV files. The app monitors a CSV file for changes every 20 seconds, processes the text content, filters out common stop words, and displays a word cloud using the Python wordcloud library. The application now includes advanced verb filtering capabilities, question type analysis, sentiment analysis with emoji visualization, and a user-configurable settings panel.

**Architecture**: Frontend (HTML/CSS/JS) + Express Backend + Python Word Cloud Generation + CSV File Processing + NLTK Verb Analysis + Question Type Classification + VADER Sentiment Analysis

## 🏗️ System Architecture

```
User's Browser <-> Express Server <-> Python Script <-> Local CSV File
     ↓                    ↓              ↓              ↓
Settings Panel      Subprocess Call   Word Cloud Gen.   NLTK Processing
Analysis Modes      Parameter Pass    Verb Filtering    POS Tagging
Static PNG Image    Mode Selection    Type Classification Question Patterns
                                     Sentiment Analysis  VADER Scoring
                                     Emoji Visualization Color Mapping
```

**Data Flow**:
1. Frontend requests word cloud data from `/api/wordcloud-data`, `/api/question-types-data`, or `/api/sentiment-data`
2. Backend spawns Python script with appropriate mode parameters
3. Python script processes CSV file and applies:
   - NLTK verb filtering (if verbs-only mode)
   - Question type classification (if question-types mode)
   - VADER sentiment analysis with emoji mapping (if sentiment mode)
   - Standard word processing (if all-words mode)
4. Python script generates static PNG word cloud image with color coding
5. Backend returns appropriate image path (all words, verbs only, question types, or sentiment)
6. Frontend displays the generated PNG image with user-defined settings
7. Process repeats every 20 seconds for real-time updates

## 📁 File Structure & Purposes

### Root Files

#### `package.json`
- **Purpose**: Node.js project configuration and dependencies
- **Key Dependencies**:
  - `express`: Web server framework
  - `csv-parser`: CSV file parsing library (legacy, now unused)
  - `cors`: Cross-origin resource sharing
  - `dotenv`: Environment variable management
- **Scripts**: `npm start` runs the server, `npm run dev` uses nodemon for development

#### `server.js` 
- **Purpose**: Main Express server with Python subprocess management
- **Key Functions**:
  - `generateWordCloud(verbsOnly)`: Spawns Python script with verb filter parameter
  - Routes: `/api/wordcloud-data`, `/api/health`, `/` (static files)
- **Important Variables**:
  - `PORT`: Server port (default 3000)
- **Configuration**: Uses environment variables for CSV file path
- **Python Integration**: Uses `child_process.spawn()` to execute Python script with arguments
- **File Management**: Serves different images based on filter mode (wordcloud_all.png, wordcloud_verbs.png, wordcloud_question_types.png, wordcloud_sentiment.png)

#### `generate_wordcloud.py`
- **Purpose**: Python script for generating visualizations from CSV data with advanced verb filtering, schema-based question type analysis, and sentiment analysis
- **Key Functions**:
  - `load_and_process_csv(csv_path, verbs_only, question_types, sentiment_analysis)`: Reads CSV and processes "Original Question" column
  - `process_text(text, verbs_only)`: Applies filtering based on mode
  - `extract_verbs(text)`: Uses NLTK POS tagging to identify verbs
  - `analyze_question_types(questions)`: Categorizes questions using 16-category schema with regex patterns
  - `analyze_sentiment(questions)`: Performs VADER sentiment analysis with emoji mapping
  - `generate_wordcloud(text, output_path)`: Creates PNG word cloud using wordcloud library with color coding
  - `generate_question_types_bar_chart(question_type_counts, output_path)`: Creates horizontal bar chart for question analysis
  - `generate_emoji_fallback(text, output_path)`: Creates colorized emoji visualization for sentiment analysis
- **Dependencies**: pandas, wordcloud, matplotlib, nltk
- **NLTK Integration**: 
  - Requires `punkt_tab`, `averaged_perceptron_tagger_eng`, and `vader_lexicon` data packages
  - Identifies verb types: VB, VBD, VBG, VBN, VBP, VBZ, MD (optional)
  - Uses tokenization for question analysis
  - VADER sentiment analyzer for emotion detection
- **Schema-Based Question Categories** (16 total):
  - EXISTS, EXTRACT, AGGREGATE, SUMMARIZE, STATUS, CALENDAR
  - DRAFT, REASON, LOOKUP, CONVERSATION, HELP, META  
  - GENERAL_KB, FLAGGED, NEEDS_CLARIFICATION, UNSUPPORTED_ACTION
- **Sentiment Categories with Color Coding**:
  - 😍 Very Positive (Hot Pink #FF69B4): compound ≥ 0.5
  - 😊 Positive (Lime Green #32CD32): 0.1 ≤ compound < 0.5
  - 😐 Neutral (Gray #808080): -0.1 < compound < 0.1
  - 😞 Negative (Dark Orange #FF8C00): -0.5 < compound ≤ -0.1
  - 😡 Very Negative (Crimson Red #DC143C): compound ≤ -0.5
- **Output Files**: 
  - `public/wordcloud_all.png` for all words mode (word cloud)
  - `public/wordcloud_verbs.png` for verbs only mode (word cloud)
  - `public/wordcloud_question_types.png` for schema-based question analysis (horizontal bar chart)
  - `public/wordcloud_sentiment.png` for sentiment analysis with colorized emojis (bar chart)
- **Configuration**: Accepts command line arguments and environment variables

#### `.env`
- **Purpose**: Environment configuration file
- **Required Variables**:
  - `CSV_FILE_PATH`: Path to the CSV file (e.g., "data/demo_feedback.csv")
  - `POLLING_INTERVAL`: Auto-refresh interval in milliseconds (default: 20000)
  - `PORT`: Server port
- **Security**: No sensitive credentials required, safe to commit template version

#### `.gitignore`
- **Purpose**: Specifies files/folders to exclude from git
- **Key Exclusions**: `node_modules/`, `.env`, build artifacts, OS files, `public/wordcloud*.png`

#### `README.md`
- **Purpose**: User-facing documentation for setup and usage
- **Contains**: Installation steps, Python setup, NLTK requirements, troubleshooting

### Public Directory (`public/`)

#### `public/index.html`
- **Purpose**: Main web page structure with settings panel
- **Key Elements**:
  - Header with title and description
  - Control panel (refresh button, auto-refresh toggle, status indicator)
  - Verb filter toggle checkbox
  - **Question types analysis toggle checkbox** (mutually exclusive with other modes)
  - **Sentiment analysis toggle checkbox** (mutually exclusive with other modes)
  - **Settings button** (⚙️ Settings) to open configuration panel
  - **Settings Panel Modal**:
    - Verb type checkboxes (base, past, gerund, participle, etc.)
    - Filtering options (min length, contractions, stop words)
    - Quick preset buttons (More Inclusive, Selective, Action Words, Default)
    - Apply/Reset buttons
  - Resizable word cloud container
  - Loading/error states
- **External Dependencies**: None (removed D3.js dependencies)

#### `public/styles.css`
- **Purpose**: Modern styling and responsive design
- **Key Features**:
  - Gradient background (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
  - Card-based layout with glassmorphism effects
  - Responsive breakpoints for mobile devices
  - CSS animations (spinner, pulse effects, hover transitions)
  - **Resizable container styling** with custom resize handles
  - **Settings Panel Styling**:
    - Modal overlay with backdrop blur
    - Gradient header matching app theme
    - Organized sections with clear visual hierarchy
    - Responsive layout for mobile devices
    - Hover effects and transitions
- **Color Scheme**: Purple/blue gradients with white content cards

#### `public/wordcloud.js`
- **Purpose**: Frontend JavaScript application logic with settings management
- **Main Class**: `WordCloudApp` - handles all client-side functionality
- **Key Methods**:
  - `fetchAndUpdateWordCloud()`: API calls with settings parameters
  - `updateWordCloudImage()`: Displays PNG image with cache busting
  - `startAutoRefresh()`: Sets up polling timer
  - **Settings Panel Methods**:
    - `showSettings()` / `hideSettings()`: Modal control
    - `getVerbSettings()`: Collects all settings values
    - `applySettings()`: Triggers word cloud regeneration
    - `resetSettings()`: Restores default values
    - `applyPreset(preset)`: Quick configuration presets
- **Settings Management**: 
  - Tracks all verb filtering options in `settingsControls` object
  - Passes settings as URL parameters to backend
  - Supports preset configurations for common use cases
- **Image Display**: Shows static PNG images with fade-in animations and resize observer
- **Interactive Features**: Settings panel, error handling, loading states, resizable layout

#### `public/wordcloud_all.png`, `public/wordcloud_verbs.png`, `public/wordcloud_question_types.png` & `public/wordcloud_sentiment.png`
- **Purpose**: Generated visualization images (auto-created by Python script)
- **Format**: PNG images with white background
- **Size**: 800x900 pixels by default
- **Updates**: Regenerated based on filter mode and settings
- **File Types**:
  - `wordcloud_all.png`: All words from questions (word cloud format)
  - `wordcloud_verbs.png`: Verb-only analysis with custom settings (word cloud format)
  - `wordcloud_question_types.png`: Schema-based question type analysis (horizontal bar chart format)
  - `wordcloud_sentiment.png`: Colorized emoji sentiment analysis with percentages and counts (bar chart format)

## 🔧 Technical Implementation Details

### Python Word Cloud Generation with NLTK (`generate_wordcloud.py`)
```python
# Text processing pipeline:
1. Read CSV file using pandas, extract "Original Question" column
2. IF sentiment_analysis mode:
   a. Initialize VADER sentiment analyzer
   b. Analyze each question for sentiment scores (compound, positive, negative, neutral)
   c. Categorize into 5 sentiment levels with emoji mapping
   d. Create frequency-based emoji text with color coding
   e. Generate colorized visualization with percentages
3. ELIF question_types mode:
   a. Analyze each question using sophisticated schema-based regex patterns
   b. Categorize into 16 defined schema types (EXISTS, EXTRACT, AGGREGATE, etc.)
   c. Apply special handling for LOOKUP category to exclude plurals
   d. Count occurrences and generate horizontal bar chart visualization
4. ELIF verbs_only mode:
   a. Combine all question text into single string
   b. Tokenize text using NLTK word_tokenize
   c. Apply POS tagging using NLTK pos_tag
   d. Filter for verb tags: VB, VBD, VBG, VBN, VBP, VBZ (+ MD if enabled)
   e. Apply additional filters (length, stop words, contractions)
5. ELSE (all words mode):
   a. Combine all question text into single string
   b. Convert to lowercase
   c. Remove punctuation with regex
   d. Split into words and apply basic filters
6. Generate appropriate visualization:
   - Word cloud with matplotlib/wordcloud (for all words, verbs, sentiment modes)
   - Horizontal bar chart with matplotlib (for question types mode)
7. Save as PNG image to public/ directory with mode-specific filename
```

### Schema-Based Question Type Analysis System
- **Custom Schema Categories** (16 total):
  - **EXISTS**: Questions about presence of items ("Any depositions?", "Do we have...")
  - **EXTRACT**: Requests for all occurrences ("List all depositions", "What medications was client on?")
  - **AGGREGATE**: Numeric counts, totals, averages ("How many medical records?")
  - **SUMMARIZE**: Requests to condense information ("Summarize the case", "Tell me about...")
  - **STATUS**: Progress and next steps queries ("What's left to do?")
  - **CALENDAR**: Date/deadline related queries ("When is the deadline?")
  - **DRAFT**: Content generation requests ("Write a demand letter")
  - **REASON**: Strategic analysis ("Should we file suit?", "Red flags?")
  - **LOOKUP**: Single value queries ("Who is the adjuster?", "What is the policy number?")
  - **CONVERSATION**: Small talk, greetings, thanks
  - **HELP**: How-to questions about Filevine or tool usage
  - **META**: Questions about AI capability or tool performance
  - **GENERAL_KB**: General knowledge unrelated to case
  - **FLAGGED**: Malicious or policy-violating content
  - **NEEDS_CLARIFICATION**: Vague or ambiguous queries
  - **UNSUPPORTED_ACTION**: Requests to modify data ("Change", "Update", "Delete")
- **Advanced Pattern Matching**: Uses sophisticated regex patterns with special handling for LOOKUP to exclude plurals
- **Bar Chart Visualization**: Generates horizontal bar chart showing count and percentage distribution
- **Professional Output**: Clean design with color-coded categories, labels, and statistical summaries

### VADER Sentiment Analysis System
- **Sentiment Engine**: Uses NLTK's VADER (Valence Aware Dictionary and sEntiment Reasoner)
- **Emotion Categories with Color Coding**:
  - **😍 Very Positive** (Hot Pink #FF69B4): Compound score ≥ 0.5
  - **😊 Positive** (Lime Green #32CD32): 0.1 ≤ compound < 0.5
  - **😐 Neutral** (Gray #808080): -0.1 < compound < 0.1
  - **😞 Negative** (Dark Orange #FF8C00): -0.5 < compound ≤ -0.1
  - **😡 Very Negative** (Crimson Red #DC143C): Compound score ≤ -0.5
- **Visualization Features**:
  - Horizontal bar chart with proportional bar lengths representing data quantities
  - Color-coded bars with emojis, labels, and data values
  - Professional layout with proper padding and spacing
  - Title "Customer Sentiment Analysis" and total response count
  - Higher resolution output (150 DPI) for better quality
- **Analysis Output**: Shows distribution of customer emotions for insight into satisfaction levels
- **Data Processing**: Analyzes all 2,000 customer responses with VADER sentiment scoring
- **Use Cases**: Customer feedback analysis, mood tracking, satisfaction monitoring
- **Example Distribution**: 
  - 😐 Neutral: 1,286 (64.3%) - Most responses are neutral inquiries
  - 😞 Negative: 305 (15.3%) - Issues, problems, or frustrations
  - 😊 Positive: 220 (11.0%) - Satisfied or appreciative responses  
  - 😡 Very Negative: 119 (5.9%) - Strong dissatisfaction or anger
  - 😍 Very Positive: 70 (3.5%) - Highly satisfied or enthusiastic responses

### Settings-Based Verb Filtering
- **Verb Categories**: All standard English verb forms plus modal verbs
- **Configurable Filters**: Minimum length, stop words, contractions, character restrictions
- **Quick Presets**: 
  - **More Inclusive**: All verb types, shorter words, includes contractions and modals
  - **More Selective**: Core verbs only, longer words, strict filtering
  - **Action Words Only**: Active verb forms, excludes passive constructions
  - **Default**: Balanced standard settings

### Image Serving with Mode Separation (`server.js`)
```javascript
// Image generation pipeline:
1. Parse request parameters (verb filter + settings)
2. Spawn Python subprocess with appropriate arguments
3. Python generates mode-specific file (wordcloud_all.png or wordcloud_verbs.png)
4. Check if correct file exists based on mode
5. Return appropriate image path to frontend
6. Frontend displays image with cache-busting timestamp
```

### Frontend Settings Management (`wordcloud.js`)
```javascript
// Settings workflow:
1. User opens settings panel via ⚙️ button
2. Adjusts verb types, filters, or selects preset
3. Clicks "Apply Settings"
4. Settings collected and passed as URL parameters
5. API call made with custom settings
6. Word cloud regenerated with new configuration
7. Settings persist during session
```

### API Endpoints
- `GET /api/wordcloud-data`: Triggers standard word cloud generation
  - **Parameters**: 
    - `verbs=true`: Enable verb-only mode
    - `includeBase`, `includePast`, etc.: Verb type toggles
    - `minLength`: Minimum word length
    - `allowContractions`: Include contractions flag
    - `strictStopWords`: Stop word filtering intensity
  - **Response**: `{success: boolean, imagePath: string, timestamp: string}`
- `GET /api/question-types-data`: Triggers schema-based question type analysis bar chart
  - **Parameters**: None (uses schema-based question type analysis)
  - **Response**: `{success: boolean, imagePath: string, timestamp: string}`
  - **Image Path**: Returns `/wordcloud_question_types.png` (horizontal bar chart format)
- `GET /api/sentiment-data`: Triggers VADER sentiment analysis with colorized emoji visualization
  - **Parameters**: None (uses default sentiment analysis settings)
  - **Response**: `{success: boolean, imagePath: string, timestamp: string}`
  - **Image Path**: Returns `/wordcloud_sentiment.png`
  - **Output**: Colorized emoji visualization with sentiment percentages and counts
- `GET /api/health`: Health check endpoint
- `GET /`: Serves static files from `public/` directory
- `GET /wordcloud_all.png`, `/wordcloud_verbs.png`, `/wordcloud_question_types.png` & `/wordcloud_sentiment.png`: Serves generated images

### Real-time Updates
- Frontend polls appropriate endpoint every 20 seconds (configurable via `POLLING_INTERVAL`)
- Each request triggers Python script execution with current mode/settings
- User can toggle between four analysis modes:
  1. **All Words**: Standard word cloud of all question text
  2. **Verbs Only**: Word cloud focused on action words with customizable settings
  3. **Question Types**: Horizontal bar chart of 16 schema-based categories
  4. **Sentiment Analysis**: Horizontal bar chart of 5 emotion levels with color coding
- Modes are mutually exclusive (only one can be active at a time)
- Settings panel allows real-time customization of verb detection parameters
- Status indicator shows connection state and processing progress
- Comprehensive error handling for Python script failures, NLTK issues, and CSV path problems
- Automatic server restart detection and reconnection
- Cache-busting with timestamps ensures fresh visualizations

## 🛠️ Development Guidelines

### Python Dependencies
```bash
pip install wordcloud matplotlib pandas nltk
python -c "import nltk; nltk.download('punkt_tab'); nltk.download('averaged_perceptron_tagger_eng'); nltk.download('vader_lexicon')"
```

### Adding New Features
1. **Backend changes**: Modify `server.js` for new endpoints or parameter handling
2. **Python changes**: Update `generate_wordcloud.py` for text processing or NLTK integration
3. **Frontend changes**: Update `wordcloud.js` for UI logic, `styles.css` for styling
4. **Settings expansion**: Add new controls to HTML and corresponding JavaScript handlers
5. **Configuration**: Add new environment variables to `.env`

### Customization Points
- **Verb Categories**: Modify verb_tags set in `extract_verbs()` function
- **NLTK Models**: Update POS tagging models or add new NLP features
- **Stop Words**: Customize STOP_WORDS set for domain-specific filtering
- **Settings Presets**: Add new preset configurations in `applyPreset()` method
- **Colors**: Update `colormap` parameter in WordCloud constructor
- **Polling interval**: Change timeout in `startAutoRefresh()`
- **Image size**: Adjust `width`/`height` in `generate_wordcloud()` function
- **Container resize**: Modify CSS resize properties and constraints

### Common Modifications
- **Advanced NLP**: Add sentiment analysis, named entity recognition, or topic modeling
- **Custom Filters**: Implement domain-specific word filtering beyond verbs
- **Export Options**: Add SVG, PDF, or other output formats
- **Data Sources**: Replace CSV reading with database connections or APIs
- **Caching**: Implement Redis or file-based caching for improved performance
- **User Profiles**: Add user-specific settings persistence
- **Batch Processing**: Handle multiple CSV files or data sources

### Debugging Tips
- **NLTK Issues**: Verify required data packages are downloaded (`punkt_tab`, `averaged_perceptron_tagger_eng`, `vader_lexicon`)
- **Settings Not Applying**: Check browser console for parameter passing
- **Python Script Errors**: Monitor server logs for subprocess failures
- **Verb Detection**: Use test_verbs.py script to debug POS tagging
- **File Generation**: Check if all PNG files exist (wordcloud_all.png, wordcloud_verbs.png, wordcloud_question_types.png, wordcloud_sentiment.png)
- **Cache Problems**: Verify timestamp-based cache busting is working
- **Settings Panel**: Ensure all form elements have correct IDs and event listeners
- **CSV File Path Issues**: 
  - Verify `.env` file contains correct `CSV_FILE_PATH=data/demo_feedback.csv`
  - Restart server after changing environment variables
  - Check server logs to confirm correct CSV file is being read
  - Ensure CSV file exists and contains "Original Question" column
  - Verify no null/empty values in data causing incorrect counts
- **Response Count Problems**: 
  - Direct Python script execution may use default path (`data/sample_data.csv`)
  - Server execution uses environment variable path
  - Always restart server after environment variable changes
  - Check server startup logs for "Reading CSV data from: [path]" message

### Dependencies to Watch
- **NLTK**: Natural language processing library for verb detection
- **wordcloud**: Python library for word cloud generation  
- **matplotlib**: Required for wordcloud image rendering
- **pandas**: CSV file reading and data manipulation
- **Node.js child_process**: For spawning Python subprocesses

## 🔐 Security Considerations

- **File Access**: App reads local files, ensure proper file permissions
- **CORS**: Currently allows all origins, restrict in production
- **Subprocess Execution**: Python script execution with user parameters - validate inputs
- **Settings Injection**: Sanitize settings parameters before passing to Python
- **Rate Limiting**: No rate limiting implemented, consider adding for production
- **Input Validation**: Validate CSV structure and NLTK model availability

## 📊 Performance Notes

- **Dataset Scale**: Currently processes 2,000 customer service queries efficiently
- **Python Startup**: Each request spawns new Python process with NLTK loading overhead
- **NLTK Processing**: POS tagging and sentiment analysis are CPU intensive for large datasets
- **Visualization Generation**: 
  - Word cloud creation scales with text complexity (all words, verbs modes)
  - Bar chart generation scales with category count (question types, sentiment modes)
- **File I/O**: Writing PNG files to disk on each request (multiple output formats)
- **Memory**: Python process loads entire CSV (2,000 rows) and NLTK models into memory
- **Settings Overhead**: Complex parameter passing increases request processing time
- **Mode-Specific Performance**:
  - All Words: Fast text processing, standard word cloud generation
  - Verbs Only: Medium (requires POS tagging for 2,000 entries)
  - Question Types: Medium (schema pattern matching with 16 categories)
  - Sentiment Analysis: Medium (VADER scoring for 2,000 entries, bar chart generation)
- **Optimization Opportunities**: 
  - Cache NLTK models in persistent Python process
  - Implement file-based caching for unchanged data
  - Pre-generate common setting combinations
  - Consider database storage for larger datasets (>5,000 entries)

## 🧪 Testing Strategy

### Manual Testing
- **Verb Detection**: Test all POS tag categories with sample sentences
- **Settings Combinations**: Verify all checkbox and input combinations work
- **Preset Functionality**: Test all quick preset configurations
- **Edge Cases**: 
  - Empty CSV files
  - CSV files without "Original Question" column
  - Large datasets (>1000 rows)
  - Malformed CSV data
  - NLTK model failures
  - All settings disabled scenarios
- **UI Responsiveness**: Test settings panel on mobile devices
- **Performance**: Test with various CSV sizes and setting complexities

### Browser Testing
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Compatibility**: iOS Safari, Android Chrome
- **Settings Panel**: Modal functionality and responsive design

### Python Testing
- **NLTK Compatibility**: Verify across NLTK versions and model updates
- **Verb Extraction**: Test POS tagging accuracy with domain-specific language
- **Parameter Handling**: Validate all settings parameter combinations

## 🔄 Advanced Features Added

### User-Configurable Verb Detection Settings

#### **Verb Type Controls**:
- **Base Form (VB)**: run, eat, go
- **Past Tense (VBD)**: ran, ate, went  
- **Gerunds/Present Participle (VBG)**: running, eating, going
- **Past Participle (VBN)**: run, eaten, gone
- **Present Non-3rd Person (VBP)**: I run, you eat
- **Present 3rd Person (VBZ)**: he runs, she eats
- **Modal Verbs (MD)**: can, will, should, must

#### **Advanced Filtering Options**:
- **Minimum Word Length**: Slider control (1-10 characters)
- **Include Contractions**: Toggle for don't, can't, won't
- **Strict Stop Words**: Toggle for aggressive common word filtering

#### **Quick Configuration Presets**:
- **More Inclusive**: Maximum verb capture (includes modals, contractions, shorter words)
- **More Selective**: High-quality verbs only (longer words, core verb forms)
- **Action Words Only**: Focus on active constructions (excludes passive forms)
- **Default**: Balanced standard configuration

### Resizable Word Cloud Container
- **CSS Resize Property**: Users can drag to resize both width and height
- **Responsive Image Scaling**: Word cloud automatically fits container size
- **Visual Resize Handles**: Custom-styled resize indicators
- **Minimum/Maximum Constraints**: Prevents over-shrinking or excessive sizing

### Enhanced File Management
- **Separate File Generation**: Different images for each mode prevent overwriting conflicts
- **Intelligent Cache Busting**: Timestamp-based image refresh prevents browser caching issues
- **Mode-Specific Serving**: Server automatically serves correct image based on current settings

## 🎯 Data Processing Focus

### CSV Structure Requirements
- **Required Column**: "Original Question" - contains the text to be analyzed
- **Current Dataset**: 2,000 customer service queries and support questions
- **Data Source**: Legal practice management system (Filevine) user interactions
- **Text Processing**: Focuses specifically on professional service inquiry patterns
- **Language Analysis**: Optimized for legal/business context with schema-based categorization

### Analytical Capabilities
- **All Words Mode**: Complete language landscape of user questions (word cloud format)
- **Verbs Only Mode**: Action-focused analysis revealing user intent (word cloud format)
- **Question Types Mode**: Schema-based categorization into 16 professional categories (horizontal bar chart)
- **Sentiment Analysis Mode**: Emotional tone analysis with 5-tier classification (horizontal bar chart)

### Current Dataset Insights (2,000 responses)
- **Dominant Patterns**: Schema analysis shows heavy usage of EXISTS, EXTRACT, and SUMMARIZE queries
- **User Behavior**: 64% neutral tone suggests professional, task-focused interactions
- **Service Areas**: Questions span case management, document generation, data extraction, and status updates
- **Emotional Distribution**: Low negative sentiment (21.2% combined) indicates generally effective user experience

This configuration provides comprehensive analytical capabilities for understanding professional service interactions, user behavior patterns, and satisfaction levels while maintaining full customization control through the intuitive interface.