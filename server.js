const express = require('express');
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    // TEMPORARY BYPASS for development
    if (sessionToken === 'development-bypass') {
        req.auth = { sessionToken: 'development-bypass' };
        return next();
    }
    
    if (!sessionToken) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // In a production app, you would verify the session token with Clerk
    // For now, we'll just check if it exists
    req.auth = { sessionToken };
    next();
};

// Common stop words to filter out
const STOP_WORDS = new Set([
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
]);

// Generate word cloud using Python script
async function generateWordCloud(verbsOnly = false, questionTypes = false, sentimentAnalysis = false, settings = null) {
    return new Promise((resolve, reject) => {
        const csvFilePath = process.env.CSV_FILE_PATH || 'data/sample_data.csv';
        
        // Check if CSV file exists
        if (!fs.existsSync(csvFilePath)) {
            reject(new Error(`CSV file not found: ${csvFilePath}`));
            return;
        }

        // Check if Python script exists
        const pythonScript = path.join(__dirname, 'generate_wordcloud.py');
        if (!fs.existsSync(pythonScript)) {
            reject(new Error('Python wordcloud script not found'));
            return;
        }

        // Prepare arguments for Python script
        const args = [pythonScript];
        if (sentimentAnalysis) {
            args.push('--sentiment=true');
        } else if (questionTypes) {
            args.push('--question-types=true');
        } else if (verbsOnly) {
            args.push('--verbs=true');
            
            // Add settings parameters if provided
            if (settings) {
                Object.keys(settings).forEach(key => {
                    args.push(`--${key}=${settings[key]}`);
                });
            }
        }

        // Debug: log the CSV file path being passed
        console.log(`Spawning Python script with CSV_FILE_PATH: ${csvFilePath}`);
        
        // Run Python script to generate word cloud
        const pythonProcess = spawn('python3', args, {
            env: { ...process.env, CSV_FILE_PATH: csvFilePath },
            cwd: __dirname
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            output += dataStr;
            console.log('Python stdout:', dataStr.trim());
        });

        pythonProcess.stderr.on('data', (data) => {
            const dataStr = data.toString();
            errorOutput += dataStr;
            console.log('Python stderr:', dataStr.trim());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                // Check for the correct file based on mode
                let imageFile;
                if (sentimentAnalysis) {
                    imageFile = 'wordcloud_sentiment.png';
                } else if (questionTypes) {
                    imageFile = 'wordcloud_question_types.png';
                } else if (verbsOnly) {
                    imageFile = 'wordcloud_verbs.png';
                } else {
                    imageFile = 'wordcloud_all.png';
                }
                
                const imagePath = `public/${imageFile}`;
                const publicPath = `/${imageFile}`;
                
                if (fs.existsSync(imagePath)) {
                    resolve({
                        success: true,
                        imagePath: publicPath,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    reject(new Error(`Word cloud image was not generated: ${imagePath}`));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}


// API Routes
app.get('/api/wordcloud-data', requireAuth, async (req, res) => {
    try {
        const verbsOnly = req.query.verbs === 'true';
        
        // Extract settings parameters from query
        const settings = {};
        const settingsKeys = [
            'includeBase', 'includePast', 'includeGerund', 'includePastParticiple',
            'includePresentNon3rd', 'includePresent3rd', 'includeModals',
            'minLength', 'allowContractions', 'strictStopWords'
        ];
        
        settingsKeys.forEach(key => {
            if (req.query[key] !== undefined) {
                // Convert string values to appropriate types
                const value = req.query[key];
                if (value === 'true' || value === 'false') {
                    settings[key] = value === 'true';
                } else if (!isNaN(value)) {
                    settings[key] = parseInt(value);
                } else {
                    settings[key] = value;
                }
            }
        });
        
        console.log(`API called with verbsOnly: ${verbsOnly}, settings:`, settings);
        const result = await generateWordCloud(verbsOnly, false, false, Object.keys(settings).length > 0 ? settings : null);
        console.log(`Returning result:`, result);
        res.json(result);
    } catch (error) {
        console.log(`API error:`, error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate word cloud' 
        });
    }
});

// API endpoint for question types analysis
app.get('/api/question-types-data', requireAuth, async (req, res) => {
    try {
        console.log('Question types API called');
        const result = await generateWordCloud(false, true, false, null);
        console.log(`Returning question types result:`, result);
        res.json(result);
    } catch (error) {
        console.log(`Question types API error:`, error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate question types word cloud' 
        });
    }
});

// API endpoint for sentiment analysis
app.get('/api/sentiment-data', requireAuth, async (req, res) => {
    try {
        console.log('Sentiment analysis API called');
        const result = await generateWordCloud(false, false, true, null);
        console.log(`Returning sentiment analysis result:`, result);
        res.json(result);
    } catch (error) {
        console.log(`Sentiment analysis API error:`, error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate sentiment analysis word cloud' 
        });
    }
});

// Get Clerk configuration
app.get('/api/clerk-config', (req, res) => {
    res.json({ 
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_YOUR_CLERK_PUBLISHABLE_KEY'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server also available on http://127.0.0.1:${PORT}`);
    console.log(`Reading CSV data from: ${process.env.CSV_FILE_PATH || 'data/sample_data.csv'}`);
    console.log(`Make sure your CSV file exists and contains text data!`);
});

module.exports = app; 