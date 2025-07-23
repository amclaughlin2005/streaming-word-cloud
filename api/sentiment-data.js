const { spawn } = require('child_process');
const fs = require('fs');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('Sentiment analysis API called');
    
    const csvPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
    
    // Set up Python environment for sentiment analysis
    const env = {
      ...process.env,
      CSV_FILE_PATH: csvPath,
      ANALYSIS_TYPE: 'sentiment'
    };

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
        
        if (code === 0) {
          const expectedFile = 'public/wordcloud_sentiment.png';
          const imagePath = '/wordcloud_sentiment.png';
          
          if (fs.existsSync(expectedFile)) {
            const result = {
              success: true,
              imagePath: imagePath,
              timestamp: new Date().toISOString(),
              mode: 'sentiment'
            };
            console.log('Returning result:', result);
            res.status(200).json(result);
            resolve();
          } else {
            console.error('Expected file not found:', expectedFile);
            res.status(500).json({
              success: false,
              error: 'Sentiment analysis was not generated',
              expectedFile,
              pythonOutput: output,
              pythonError: errorOutput
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
            errorOutput
          });
          resolve();
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to start sentiment analysis process',
          details: error.message
        });
        resolve();
      });
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
} 