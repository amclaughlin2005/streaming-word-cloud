# Vercel Deployment Guide

## Overview
This app is now configured for Vercel deployment with Node.js serverless functions that call Python scripts for word cloud generation.

## Fixed Issues

### 1. API Structure
- ✅ Created proper Vercel API endpoints in `/api/` directory
- ✅ `api/wordcloud-data.js` - Main word cloud generation  
- ✅ `api/question-types-data.js` - Question type analysis
- ✅ `api/sentiment-data.js` - Sentiment analysis
- ✅ `api/index.js` - Serves the main HTML page

### 2. Configuration
- ✅ Updated `vercel.json` to route correctly to Node.js functions
- ✅ Removed Python function routing (using Node.js to call Python)
- ✅ Added proper static file serving for CSS, JS, and images
- ✅ Set function timeout to 30 seconds for Python processing

### 3. Dependencies
- ✅ Created `requirements.txt` with exact Python package versions
- ✅ Node.js dependencies already in `package.json`

## Deployment Steps

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Fix Vercel deployment configuration"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

3. **Environment Variables** (set in Vercel dashboard):
   - `CSV_FILE_PATH=data/demo_feedback.csv`
   - `NODE_ENV=production`

## How It Works Now

### Frontend → API Flow
1. Frontend makes requests to `/api/wordcloud-data`, `/api/question-types-data`, etc.
2. Vercel routes these to the corresponding Node.js serverless functions
3. Node.js functions spawn Python scripts with correct arguments
4. Python scripts generate word cloud images in `/public/` directory  
5. Node.js functions return image paths to frontend
6. Frontend displays the images

### File Structure
```
/
├── api/
│   ├── index.js              # Serves main HTML
│   ├── wordcloud-data.js     # Word cloud generation
│   ├── question-types-data.js # Question analysis  
│   └── sentiment-data.js     # Sentiment analysis
├── public/
│   ├── index.html           # Frontend
│   ├── styles.css           # Styling
│   ├── wordcloud.js         # Frontend logic
│   └── *.png               # Generated images
├── data/
│   └── demo_feedback.csv    # Data source
├── generate_wordcloud.py    # Python script
├── requirements.txt         # Python dependencies
├── package.json            # Node.js dependencies
└── vercel.json             # Vercel configuration
```

## Troubleshooting

### If Python packages fail to install:
- Check `requirements.txt` has exact versions
- Vercel supports Python 3.9 by default

### If images don't load:
- Check Vercel function logs for Python script errors
- Ensure `data/demo_feedback.csv` exists and has data

### If API calls fail:
- Check Vercel function logs
- Ensure API routes match frontend expectations

## Testing Locally

To test the Vercel setup locally:
```bash
npm install -g vercel
vercel dev
```

This will simulate the Vercel environment on your local machine. 