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
    console.log('Question types API called');
    
    // Get data from Vercel Blob or local file
    let csvData = [];
    let csvPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
    
    try {
      // First try to get data from Vercel Blob (for production)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('Loading data from Vercel Blob for question types...');
        const cloudStorage = require('./cloud-storage');
        const blobResult = await cloudStorage.getDataWithInit();
        
        if (blobResult.success && blobResult.data && blobResult.data.length > 0) {
          csvData = blobResult.data;
          console.log(`Loaded ${csvData.length} records from Vercel Blob for question types`);
          
          // Create temporary file for Python script
          tempFilePath = path.join(os.tmpdir(), `question_types_data_${Date.now()}.csv`);
          const csvContent = cloudStorage.convertDataToCsv(csvData);
          fs.writeFileSync(tempFilePath, csvContent);
          csvPath = tempFilePath;
          console.log(`Created temporary CSV file for question types: ${tempFilePath}`);
        }
      }
      
      // If no data from Blob, check if local file exists (for development)
      if (csvData.length === 0 && fs.existsSync(csvPath)) {
        console.log(`Using local CSV file for question types: ${csvPath}`);
      } else if (csvData.length === 0) {
        throw new Error(`No data available for question types analysis. CSV file not found: ${csvPath}`);
      }
      
    } catch (dataError) {
      console.error('Error loading data for question types analysis:', dataError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load data for question types analysis',
        details: dataError.message,
        CSV_FILE_PATH: csvPath,
        hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
      });
    }
    
    // Set up Python environment for question types
    const env = {
      ...process.env,
      CSV_FILE_PATH: csvPath,
      ANALYSIS_TYPE: 'question_types'
    };

    console.log(`Running question types analysis with CSV_FILE_PATH: ${csvPath}`);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['generate_wordcloud.py', '--question-types=true'], {
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
            console.log('Cleaned up temporary question types file:', tempFilePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp question types file:', cleanupError.message);
          }
        }
        
        if (code === 0) {
          const expectedFile = 'public/wordcloud_question_types.png';
          const imagePath = '/wordcloud_question_types.png';
          
          if (fs.existsSync(expectedFile)) {
            const result = {
              success: true,
              imagePath: imagePath,
              timestamp: new Date().toISOString(),
              mode: 'question_types',
              dataSource: tempFilePath ? 'vercel-blob' : 'local-file',
              recordCount: csvData.length
            };
            console.log('Returning question types result:', result);
            res.status(200).json(result);
            resolve();
          } else {
            console.error('Expected question types file not found:', expectedFile);
            res.status(500).json({
              success: false,
              error: 'Question types analysis was not generated',
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
            error: 'Failed to generate question types analysis',
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
            console.log('Cleaned up temporary question types file after error:', tempFilePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp question types file after error:', cleanupError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          error: 'Failed to start question types analysis process',
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
        console.log('Cleaned up temporary question types file after error:', tempFilePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp question types file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}; 