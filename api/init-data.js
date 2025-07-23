module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const cloudStorage = require('./cloud-storage');

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'BLOB_READ_WRITE_TOKEN environment variable not configured',
        help: 'Please set up Vercel Blob storage and add the token to your environment variables'
      });
    }

    if (req.method === 'GET') {
      // Check current data status
      try {
        const result = await cloudStorage.getLatestFromBlob();
        
        if (result.success && result.data) {
          return res.status(200).json({
            success: true,
            status: 'data-exists',
            recordCount: result.data.length,
            message: `Vercel Blob contains ${result.data.length} records`
          });
        } else {
          return res.status(200).json({
            success: true,
            status: 'no-data',
            recordCount: 0,
            message: 'No data found in Vercel Blob. You can POST to this endpoint to initialize with demo data.'
          });
        }
      } catch (error) {
        return res.status(200).json({
          success: true,
          status: 'no-data',
          recordCount: 0,
          error: error.message,
          message: 'No data found in Vercel Blob. You can POST to this endpoint to initialize with demo data.'
        });
      }
    }

    if (req.method === 'POST') {
      // Initialize with demo data
      const result = await cloudStorage.initializeDemoData();
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.reason === 'data-exists' 
            ? `Data already exists (${result.recordCount} records)` 
            : `Successfully initialized with ${result.recordCount} demo records`,
          recordCount: result.recordCount,
          reason: result.reason,
          url: result.url
        });
      } else {
        return res.status(500).json({
          success: false,
          error: `Failed to initialize demo data: ${result.reason}`,
          details: result.error
        });
      }
    }

  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize data'
    });
  }
}; 