const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const csv = require('csv-parser');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { csvData, mode = 'append' } = req.body;
    
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid CSV data format. Expected array of objects.' 
      });
    }

    // Validate required fields
    const requiredField = 'Original Question';
    const invalidRows = csvData.filter(row => !row[requiredField] || !row.Timestamp);
    
    if (invalidRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields. All rows must have 'Timestamp' and '${requiredField}' columns.`,
        invalidRowCount: invalidRows.length
      });
    }

    // Load existing data - try Vercel Blob first, then local file
    let existingData = [];
    let existingTimestamps = new Set();
    let dataSource = 'none';
    
    try {
      // First, try to load from Vercel Blob (for production)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const cloudStorage = require('./cloud-storage');
          const blobResult = await cloudStorage.getDataWithInit();
          
          if (blobResult.success && blobResult.data) {
            existingData = blobResult.data;
            existingTimestamps = new Set(existingData.map(row => row.Timestamp));
            dataSource = 'vercel-blob';
            console.log(`Loaded ${existingData.length} existing records from Vercel Blob`);
          }
        } catch (blobError) {
          console.log('Error loading data from Vercel Blob:', blobError.message);
        }
      }
      
      // If no data from Blob, try local file (for development)
      if (existingData.length === 0) {
        const currentDataPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
        
        try {
          const fileExists = await fs.access(currentDataPath).then(() => true).catch(() => false);
          
          if (fileExists) {
            existingData = await readCsvFile(currentDataPath);
            existingTimestamps = new Set(existingData.map(row => row.Timestamp));
            dataSource = 'local-file';
            console.log(`Loaded ${existingData.length} existing records from local file`);
            
            // Create backup of local file
            const backupPath = currentDataPath.replace('.csv', '_backup.csv');
            await fs.copyFile(currentDataPath, backupPath);
          }
        } catch (fileError) {
          console.log('No local file found:', fileError.message);
        }
      }
    } catch (error) {
      console.log('Error loading existing data:', error.message);
    }

    // Deduplicate by timestamp
    const newData = csvData.filter(row => !existingTimestamps.has(row.Timestamp));
    const duplicateCount = csvData.length - newData.length;

    if (newData.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new records to add (all were duplicates)',
        stats: {
          totalReceived: csvData.length,
          duplicatesSkipped: duplicateCount,
          newRecordsAdded: 0,
          totalRecords: existingData.length,
          dataSource: dataSource
        }
      });
    }

    // Determine final data based on mode
    let finalData;
    if (mode === 'replace') {
      finalData = newData;
    } else {
      finalData = [...existingData, ...newData];
    }

    // Save to local file (for development)
    try {
      const currentDataPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
      
      // Ensure directory exists
      const dirPath = path.dirname(currentDataPath);
      await fs.mkdir(dirPath, { recursive: true });
      
      await writeCsvFile(currentDataPath, finalData);
      console.log(`Saved ${finalData.length} records to local file`);
    } catch (localError) {
      console.log('Could not save to local file (probably in serverless environment):', localError.message);
    }

    // Upload to cloud storage if configured
    let cloudUploadResult = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const currentDataPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
        cloudUploadResult = await uploadToCloudStorage(currentDataPath, finalData);
        console.log('Successfully uploaded to Vercel Blob');
      } catch (cloudError) {
        console.error('Cloud upload failed:', cloudError);
        // Don't fail the request if cloud upload fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed ${newData.length} new records`,
      stats: {
        totalReceived: csvData.length,
        duplicatesSkipped: duplicateCount,
        newRecordsAdded: newData.length,
        totalRecords: finalData.length,
        mode: mode,
        cloudUpload: cloudUploadResult ? 'success' : 'skipped',
        dataSource: dataSource,
        backupCreated: dataSource === 'local-file'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process upload'
    });
  }
};

// Helper function to read CSV file
async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to write CSV file
async function writeCsvFile(filePath, data) {
  if (data.length === 0) return;
  
  // Use our built-in CSV conversion function
  const cloudStorage = require('./cloud-storage');
  const csvContent = cloudStorage.convertDataToCsv(data);
  
  await fs.writeFile(filePath, csvContent, 'utf8');
}

// Helper function to upload to cloud storage
async function uploadToCloudStorage(filePath, data) {
  try {
    const cloudStorage = require('./cloud-storage');
    
    if (!cloudStorage.isCloudStorageConfigured()) {
      console.log('Cloud storage not configured, skipping upload');
      return null;
    }

    const filename = `wordcloud-data-${Date.now()}.csv`;
    const result = await cloudStorage.uploadToCloud(data, { filename });
    
    return {
      uploaded: true,
      location: result.url,
      key: result.key,
      downloadUrl: result.downloadUrl,
      timestamp: new Date().toISOString(),
      recordCount: data.length,
      fileSize: result.metadata.fileSize
    };
  } catch (error) {
    console.error('Cloud storage upload failed:', error);
    return {
      uploaded: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
} 