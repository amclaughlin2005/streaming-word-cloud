const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let tempFilePath = null;

  try {
    console.log('Sentiment analysis API called');
    
    // Get data from Vercel Blob or local file
    let csvData = [];
    let csvPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
    
    try {
      // First try to get data from Vercel Blob (for production)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('Loading data from Vercel Blob for sentiment analysis...');
        const cloudStorage = require('./cloud-storage');
        const blobResult = await cloudStorage.getDataWithInit();
        
        if (blobResult.success && blobResult.data && blobResult.data.length > 0) {
          csvData = blobResult.data;
          console.log(`Loaded ${csvData.length} records from Vercel Blob for sentiment analysis`);
          
          // Create temporary file for Python script
          tempFilePath = path.join(os.tmpdir(), `sentiment_data_${Date.now()}.csv`);
          const csvContent = cloudStorage.convertDataToCsv(csvData);
          fs.writeFileSync(tempFilePath, csvContent);
          csvPath = tempFilePath;
          console.log(`Created temporary CSV file for sentiment: ${tempFilePath}`);
        }
      }
      
      // If no data from Blob, check if local file exists (for development)
      if (csvData.length === 0 && fs.existsSync(csvPath)) {
        console.log(`Using local CSV file for sentiment: ${csvPath}`);
      } else if (csvData.length === 0) {
        throw new Error(`No data available for sentiment analysis. CSV file not found: ${csvPath}`);
      }
      
    } catch (dataError) {
      console.error('Error loading data for sentiment analysis:', dataError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load data for sentiment analysis',
        details: dataError.message,
        CSV_FILE_PATH: csvPath,
        hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
      });
    }
    
    // Set up Python environment for sentiment analysis
    const env = {
      ...process.env,
      CSV_FILE_PATH: csvPath,
      ANALYSIS_TYPE: 'sentiment'
    };

    console.log(`Running sentiment analysis with CSV_FILE_PATH: ${csvPath}`);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['generate_wordcloud.py', '--sentiment=true'], {
        env,
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log('Cleaned up temporary sentiment file:', tempFilePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp sentiment file:', cleanupError.message);
          }
        }
        
        if (code === 0) {
          const expectedFile = 'public/wordcloud_sentiment.png';
          const imagePath = '/wordcloud_sentiment.png';
          
          if (fs.existsSync(expectedFile)) {
            const result = {
              success: true,
              imagePath: imagePath,
              timestamp: new Date().toISOString(),
              mode: 'sentiment',
              dataSource: tempFilePath ? 'vercel-blob' : 'local-file',
              recordCount: csvData.length
            };
            console.log('Returning sentiment result:', result);
            res.status(200).json(result);
            resolve();
          } else {
            console.error('Expected sentiment file not found:', expectedFile);
            res.status(500).json({
              success: false,
              error: 'Sentiment analysis was not generated',
              expectedFile,
              pythonOutput: output,
              pythonError: errorOutput,
              csvPath: csvPath,
              dataSource: tempFilePath ? 'vercel-blob' : 'local-file'
            });
            resolve();
          }
        } else {
          console.error('Python script failed with code:', code);
          res.status(500).json({
            success: false,
            error: 'Failed to generate sentiment analysis',
            code,
            output,
            errorOutput,
            csvPath: csvPath,
            dataSource: tempFilePath ? 'vercel-blob' : 'local-file'
          });
          resolve();
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        
        // Clean up temporary file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log('Cleaned up temporary sentiment file after error:', tempFilePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp sentiment file after error:', cleanupError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          error: 'Failed to start sentiment analysis process',
          details: error.message,
          csvPath: csvPath,
          dataSource: tempFilePath ? 'vercel-blob' : 'local-file'
        });
        resolve();
      });
    });

  } catch (error) {
    console.error('API error:', error);
    
    // Clean up temporary file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Cleaned up temporary sentiment file after error:', tempFilePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp sentiment file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}; 