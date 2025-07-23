const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('API called with query:', req.query);
    
    // Determine which type of word cloud to generate
    const verbsOnly = req.query.verbs === 'true';
    const csvPath = process.env.CSV_FILE_PATH || 'data/demo_feedback.csv';
    
    // Set up Python environment
    const env = {
      ...process.env,
      CSV_FILE_PATH: csvPath,
      VERBS_ONLY: verbsOnly ? 'true' : 'false'
    };

    // Run the Python word cloud generation script
    const pythonScript = verbsOnly ? 
      'CSV_FILE_PATH=' + csvPath + ' VERBS_ONLY=true python3 generate_wordcloud.py --verbs-only' :
      'CSV_FILE_PATH=' + csvPath + ' python3 generate_wordcloud.py';

    console.log('Running Python script:', pythonScript);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['generate_wordcloud.py', verbsOnly ? '--verbs-only' : ''], {
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
          // Check which file was generated
          const expectedFile = verbsOnly ? 'public/wordcloud_verbs.png' : 'public/wordcloud_all.png';
          const imagePath = verbsOnly ? '/wordcloud_verbs.png' : '/wordcloud_all.png';
          
          if (fs.existsSync(expectedFile)) {
            const result = {
              success: true,
              imagePath: imagePath,
              timestamp: new Date().toISOString(),
              mode: verbsOnly ? 'verbs' : 'all'
            };
            console.log('Returning result:', result);
            res.status(200).json(result);
            resolve();
          } else {
            console.error('Expected file not found:', expectedFile);
            res.status(500).json({
              success: false,
              error: 'Word cloud image was not generated',
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
            error: 'Failed to generate word cloud',
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
          error: 'Failed to start word cloud generation process',
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
}; 