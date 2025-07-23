# Production CSV Data Setup

## Current Demo Data
- **File**: `data/demo_feedback.csv`
- **Size**: 3,145 rows
- **Columns**: `Timestamp`, `Original Question`, `Org Ids`, `User ID`, `Project ID`, `Shard`
- **Content**: Legal AI system queries (Filevine AI data)

## Production Options

### Option 1: Replace Demo File (Simplest)
```bash
# 1. Replace demo data with your production data
cp your-production-data.csv data/demo_feedback.csv

# 2. Ensure CSV has the required format:
# Required column: "Original Question" (the text to analyze)
# Optional columns: Any additional metadata

# 3. Deploy
git add data/demo_feedback.csv
git commit -m "Update to production data"
git push origin main
```

### Option 2: Environment Variables (Recommended)
1. **Add your CSV file** to the `data/` folder
2. **In Vercel Dashboard** → Settings → Environment Variables:
   ```
   CSV_FILE_PATH=data/your-production-file.csv
   ```
3. **Redeploy** your application

### Option 3: Cloud Storage (For Large Files)
```javascript
// Update generate_wordcloud.py to fetch from URL
import requests
import pandas as pd

def load_csv_from_url(url):
    response = requests.get(url)
    return pd.read_csv(StringIO(response.content.decode('utf-8')))

# Examples:
# - AWS S3: https://bucket.s3.amazonaws.com/file.csv
# - Google Drive: Public shareable link
# - Dropbox: Direct download link
```

### Option 4: Database Integration
```javascript
// Replace CSV with database queries
import psycopg2  // PostgreSQL
import sqlite3   // SQLite
import pymongo   // MongoDB

// Query recent data for real-time word clouds
```

## CSV Format Requirements

Your production CSV must have:

### Required Column
- **`Original Question`**: The text content to analyze

### Optional Columns
- `Timestamp`: For time-based filtering
- `User ID`: For user-based analysis
- `Category`: For category-based word clouds
- Any other metadata fields

### Example Format
```csv
Timestamp,Original Question,Category,User ID
2024-01-15 10:30:00,"How do I reset my password?","Technical",user123
2024-01-15 10:31:00,"What are your business hours?","General",user456
2024-01-15 10:32:00,"I need help with billing","Billing",user789
```

## File Size Considerations

- **Small files** (< 1MB): Store in repository
- **Medium files** (1-10MB): Use cloud storage
- **Large files** (> 10MB): Use database or chunked processing
- **Real-time data**: Connect to API or database

## Environment Variables

Set these in Vercel Dashboard:

```bash
# Required
CSV_FILE_PATH=data/your-file.csv

# Optional
VERCEL_TIMEOUT=30           # Function timeout
MAX_WORDS=100              # Word cloud size
REFRESH_INTERVAL=20000     # Auto-refresh interval
```

## Testing Your Data

Before deploying, test locally:

```bash
# Test CSV format
CSV_FILE_PATH=data/your-file.csv python3 generate_wordcloud.py

# Test different modes
CSV_FILE_PATH=data/your-file.csv python3 generate_wordcloud.py --verbs-only
```

## Security Considerations

- **Sensitive data**: Use environment variables, not committed files
- **Large files**: Use `.gitignore` to avoid committing large CSVs
- **Public data**: Can be committed to repository
- **Private data**: Use cloud storage with authentication

## Deployment Checklist

- [ ] CSV has required "Original Question" column
- [ ] File size is appropriate for deployment method
- [ ] Environment variables are set in Vercel
- [ ] Data is properly formatted and encoded (UTF-8)
- [ ] Test locally before deploying
- [ ] Sensitive data is not committed to git 