# 📤 Data Upload Feature

## Overview
The upload feature allows you to dynamically add new CSV data to your word cloud application with automatic deduplication and cloud storage backup.

## ✨ Features

### 🔄 **Intelligent Deduplication**
- **Timestamp-based**: Only adds records with new timestamps
- **Automatic backup**: Creates backup before any changes
- **Conflict resolution**: Shows detailed stats on duplicates vs new records

### ☁️ **Cloud Storage Integration**
- **AWS S3 support**: Automatic backup to Amazon S3
- **Extensible**: Ready for Google Cloud & Azure integration
- **Versioned backups**: Each upload creates a timestamped backup

### 🎯 **Multiple Upload Methods**
- **File Upload**: Drag & drop CSV files
- **Direct Input**: Paste CSV text directly
- **Two modes**: Append to existing data or replace entirely

### 📊 **Real-time Feedback**
- **Progress tracking**: Visual upload progress
- **Detailed statistics**: Shows records added, duplicates skipped
- **Data preview**: Preview data before uploading
- **Instant refresh**: Word cloud updates immediately after upload

## 🚀 Getting Started

### 1. **Basic Upload (Local Only)**
Just use the upload feature as-is! No configuration needed.

### 2. **Enable Cloud Storage (AWS S3)**
Set these environment variables in your Vercel dashboard:

```bash
# Required for S3 integration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

## 📋 CSV Requirements

### **Required Columns**
- `Timestamp` - When the record was created
- `Original Question` - The text content to analyze

### **Optional Columns**
- `User ID` - For user-based analysis
- `Category` - For category filtering
- `Project ID` - For project-based grouping
- Any other metadata fields

### **Example Format**
```csv
Timestamp,Original Question,User ID,Category
2024-01-15 10:30:00,"How do I reset my password?",user123,Technical
2024-01-15 10:31:00,"What are your business hours?",user456,General
2024-01-15 10:32:00,"I need help with billing",user789,Billing
```

## 🎮 How to Use

### **Step 1: Access Upload Panel**
- Click the red **"📤 Upload Data"** button in the main controls
- The upload panel will open with instructions and options

### **Step 2: Choose Upload Method**

#### **Option A: File Upload**
1. Click the upload area or drag & drop a CSV file
2. File must be .csv format and under 10MB
3. Data will be automatically validated

#### **Option B: Direct Input**
1. Paste CSV text directly into the text area
2. Include headers and data rows
3. Data will be parsed and validated in real-time

### **Step 3: Preview Data (Optional)**
- Click **"👁️ Preview Data"** to see first 10 rows
- Verify column mapping and data format
- Check for any formatting issues

### **Step 4: Choose Upload Mode**
- **Append**: Add new data to existing records (recommended)
- **Replace**: Replace all existing data with new data

### **Step 5: Upload**
- Click **"📤 Upload Data"** to start the process
- Watch the progress bar for real-time updates
- Review statistics when complete

### **Step 6: Automatic Refresh**
- Word cloud automatically refreshes with new data
- View updated visualizations immediately
- All analysis modes (verbs, sentiment, question types) work with new data

## 📊 Upload Results

After upload, you'll see detailed statistics:

- **Received**: Total records in your upload
- **Added**: New records added to the dataset
- **Duplicates**: Records skipped (already existed)
- **Total Records**: Final count in the dataset
- **Cloud Backup**: Status of cloud storage upload

## 🔧 Technical Details

### **API Endpoints**
- `POST /api/upload-data` - Main upload endpoint
- Supports JSON payload with CSV data array
- Returns detailed statistics and success/error status

### **Deduplication Logic**
```javascript
// Records are deduplicated by timestamp
const existingTimestamps = new Set(existingData.map(row => row.Timestamp));
const newData = csvData.filter(row => !existingTimestamps.has(row.Timestamp));
```

### **Cloud Storage Flow**
1. **Local Processing**: Data is processed and stored locally first
2. **Cloud Backup**: Successfully processed data is uploaded to S3
3. **Metadata Tracking**: Upload metadata stored with timestamps
4. **Error Handling**: Local success guaranteed even if cloud fails

### **Security Features**
- **File size limits**: 10MB maximum upload size
- **Content validation**: Strict CSV format checking
- **Required field validation**: Ensures data integrity
- **Backup creation**: Automatic backup before any changes

## 🛠️ Environment Variables

### **Required for Basic Functionality**
```bash
CSV_FILE_PATH=data/demo_feedback.csv  # Path to your data file
NODE_ENV=production                   # Environment setting
```

### **Required for AWS S3 Integration**
```bash
AWS_ACCESS_KEY_ID=AKIA...            # Your AWS access key
AWS_SECRET_ACCESS_KEY=...            # Your AWS secret key  
AWS_S3_BUCKET=your-bucket-name       # S3 bucket name
AWS_REGION=us-east-1                 # AWS region (optional)
```

### **Optional Configuration**
```bash
MAX_UPLOAD_SIZE=10485760             # Max file size (10MB default)
BACKUP_RETENTION_DAYS=30             # How long to keep backups
CLOUD_PROVIDER=aws                   # Cloud provider (aws/gcp/azure)
```

## 🚨 Troubleshooting

### **Upload Fails**
- **Check CSV format**: Ensure required columns exist
- **File size**: Must be under 10MB
- **Data validation**: All rows need Timestamp and Original Question

### **Cloud Storage Issues**
- **AWS credentials**: Verify access key and secret are correct
- **S3 bucket**: Ensure bucket exists and is accessible
- **Permissions**: AWS user needs s3:PutObject and s3:GetObject permissions

### **Data Not Appearing**
- **Refresh word cloud**: Click refresh or wait for auto-refresh
- **Check filters**: Ensure analysis mode includes your data type
- **Verify upload**: Check upload statistics for successful records

## 🔄 Data Flow

```
1. User uploads CSV → 
2. Frontend validates format → 
3. API processes & deduplicates → 
4. Local file updated → 
5. Cloud backup created → 
6. Statistics returned → 
7. Word cloud refreshes → 
8. Updated visualization shown
```

## 🔮 Future Enhancements

- **Google Cloud Storage** integration
- **Azure Blob Storage** integration  
- **Real-time data streaming** from APIs
- **Scheduled data imports** from URLs
- **Advanced filtering** during upload
- **Data transformation** options
- **Multiple file format** support (JSON, Excel)

## 💡 Tips & Best Practices

1. **Start small**: Test with a few records first
2. **Use timestamps**: Ensure timestamps are unique and properly formatted
3. **Preview data**: Always preview before uploading large datasets
4. **Cloud backup**: Set up S3 for automatic backups
5. **Regular uploads**: Use append mode for incremental updates
6. **Monitor statistics**: Check upload stats to verify data integrity

The upload feature makes your word cloud truly dynamic - add new data anytime and see immediate updates in your visualizations! 🎉 