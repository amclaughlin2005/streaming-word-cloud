const { put, list, del, head } = require('@vercel/blob');

/**
 * Upload CSV data to Vercel Blob
 */
async function uploadToBlob(data, filename = null) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable not configured');
    }

    const pathname = filename || `wordcloud-data-${Date.now()}.csv`;
    
    // Convert data to CSV string
    const csvContent = convertDataToCsv(data);
    
    try {
        const blob = await put(pathname, csvContent, {
            access: 'public',
            addRandomSuffix: true,
            contentType: 'text/csv',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        return {
            success: true,
            location: blob.url,
            key: blob.pathname,
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            metadata: {
                uploadTime: new Date().toISOString(),
                recordCount: data.length,
                fileSize: Buffer.byteLength(csvContent, 'utf8'),
                pathname: blob.pathname,
                contentType: blob.contentType
            }
        };
    } catch (error) {
        console.error('Vercel Blob upload error:', error);
        throw new Error(`Failed to upload to Vercel Blob: ${error.message}`);
    }
}

/**
 * Download CSV data from Vercel Blob
 */
async function downloadFromBlob(urlOrPathname) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable not configured');
    }

    try {
        // First get the blob metadata
        const blobInfo = await head(urlOrPathname, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        // Fetch the actual content
        const response = await fetch(blobInfo.url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvContent = await response.text();
        const data = parseCsvContent(csvContent);
        
        return {
            success: true,
            data: data,
            metadata: {
                lastModified: blobInfo.uploadedAt,
                contentLength: blobInfo.size,
                pathname: blobInfo.pathname,
                url: blobInfo.url
            }
        };
    } catch (error) {
        console.error('Vercel Blob download error:', error);
        throw new Error(`Failed to download from Vercel Blob: ${error.message}`);
    }
}

/**
 * List all CSV files in the Vercel Blob store
 */
async function listBlobFiles() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable not configured');
    }

    try {
        const result = await list({
            prefix: 'wordcloud-data-',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        return {
            success: true,
            files: result.blobs.map(blob => ({
                key: blob.pathname,
                size: blob.size || 0,
                lastModified: blob.uploadedAt,
                url: blob.url,
                downloadUrl: blob.downloadUrl
            }))
        };
    } catch (error) {
        console.error('Vercel Blob list error:', error);
        throw new Error(`Failed to list Vercel Blob files: ${error.message}`);
    }
}

/**
 * Get the latest CSV file from Vercel Blob
 */
async function getLatestFromBlob() {
    try {
        const fileList = await listBlobFiles();
        
        if (!fileList.success || fileList.files.length === 0) {
            return { success: false, error: 'No files found in Vercel Blob' };
        }

        // Sort by last modified date, get the newest
        const latestFile = fileList.files.sort((a, b) => 
            new Date(b.lastModified) - new Date(a.lastModified)
        )[0];

        const data = await downloadFromBlob(latestFile.url);
        
        return {
            success: true,
            data: data.data,
            file: latestFile,
            metadata: data.metadata
        };
    } catch (error) {
        console.error('Error getting latest Vercel Blob file:', error);
        throw new Error(`Failed to get latest file: ${error.message}`);
    }
}

/**
 * Delete a file from Vercel Blob
 */
async function deleteFromBlob(urlOrPathname) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable not configured');
    }

    try {
        await del(urlOrPathname, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        return {
            success: true,
            message: 'File deleted successfully'
        };
    } catch (error) {
        console.error('Vercel Blob delete error:', error);
        throw new Error(`Failed to delete from Vercel Blob: ${error.message}`);
    }
}

/**
 * Convert array of objects to CSV string
 */
function convertDataToCsv(data) {
    if (!data || data.length === 0) {
        return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.map(header => `"${header}"`).join(','));

    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

/**
 * Parse CSV content into array of objects
 */
function parseCsvContent(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        return [];
    }

    // Parse headers
    const headers = parseCsvLine(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }

    return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quotes
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

/**
 * Alternative cloud storage options (placeholder)
 */
async function uploadToGoogleCloud(data, filename) {
    // Placeholder for Google Cloud Storage integration
    throw new Error('Google Cloud Storage not yet implemented');
}

async function uploadToAzure(data, filename) {
    // Placeholder for Azure Blob Storage integration
    throw new Error('Azure Blob Storage not yet implemented');
}

/**
 * Main upload function that routes to the appropriate cloud provider
 */
async function uploadToCloud(data, options = {}) {
    const { filename, provider = 'vercel' } = options;
    
    switch (provider.toLowerCase()) {
        case 'vercel':
        case 'blob':
            return await uploadToBlob(data, filename);
        case 'gcp':
        case 'google':
            return await uploadToGoogleCloud(data, filename);
        case 'azure':
            return await uploadToAzure(data, filename);
        default:
            throw new Error(`Unsupported cloud provider: ${provider}`);
    }
}

/**
 * Check if cloud storage is configured
 */
function isCloudStorageConfigured() {
    return !!(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Initialize Vercel Blob with demo data if no data exists
 */
async function initializeDemoData() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('No Blob token configured, skipping demo data initialization');
        return { success: false, reason: 'no-token' };
    }

    try {
        // Check if data already exists in Vercel Blob
        const existingData = await getLatestFromBlob();
        if (existingData.success && existingData.data && existingData.data.length > 0) {
            console.log(`Vercel Blob already has ${existingData.data.length} records, skipping initialization`);
            return { success: true, reason: 'data-exists', recordCount: existingData.data.length };
        }
    } catch (error) {
        console.log('No existing data in Vercel Blob, proceeding with demo data initialization');
    }

    // Demo data to initialize with (a subset of the actual demo data)
    const demoData = [
        {
            "Timestamp": "2024-01-15 09:23:15",
            "Original Question": "What are the legal requirements for starting a business in California?",
            "Category": "Business Law",
            "Complexity": "Medium"
        },
        {
            "Timestamp": "2024-01-15 10:45:32",
            "Original Question": "How do I file for divorce in New York state?",
            "Category": "Family Law", 
            "Complexity": "High"
        },
        {
            "Timestamp": "2024-01-15 11:12:08",
            "Original Question": "What is the statute of limitations for personal injury claims?",
            "Category": "Personal Injury",
            "Complexity": "Medium"
        },
        {
            "Timestamp": "2024-01-15 14:30:45",
            "Original Question": "Can my landlord evict me without notice?",
            "Category": "Housing Law",
            "Complexity": "Medium"
        },
        {
            "Timestamp": "2024-01-15 16:20:12",
            "Original Question": "How do I trademark my business name?",
            "Category": "Intellectual Property",
            "Complexity": "High"
        }
    ];

    try {
        const result = await uploadToBlob(demoData, 'demo-data-initialization.csv');
        console.log(`Successfully initialized Vercel Blob with ${demoData.length} demo records`);
        
        return {
            success: true,
            reason: 'initialized',
            recordCount: demoData.length,
            url: result.url
        };
    } catch (error) {
        console.error('Failed to initialize demo data:', error);
        return {
            success: false,
            reason: 'upload-failed',
            error: error.message
        };
    }
}

/**
 * Get data with automatic initialization if needed
 */
async function getDataWithInit() {
    try {
        // First try to get existing data
        const result = await getLatestFromBlob();
        
        if (result.success && result.data && result.data.length > 0) {
            return result;
        }
        
        // If no data exists, initialize with demo data
        console.log('No data found, initializing with demo data...');
        const initResult = await initializeDemoData();
        
        if (initResult.success) {
            // Try to get the data again after initialization
            return await getLatestFromBlob();
        } else {
            return {
                success: false,
                error: 'Failed to initialize demo data',
                initResult: initResult
            };
        }
    } catch (error) {
        console.error('Error in getDataWithInit:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Legacy function names for compatibility
const uploadToS3 = uploadToBlob;
const downloadFromS3 = downloadFromBlob;
const listS3Files = listBlobFiles;
const getLatestFromS3 = getLatestFromBlob;

module.exports = {
    uploadToCloud,
    uploadToBlob,
    uploadToS3, // Legacy compatibility
    downloadFromBlob,
    downloadFromS3, // Legacy compatibility
    listBlobFiles,
    listS3Files, // Legacy compatibility
    getLatestFromBlob,
    getLatestFromS3, // Legacy compatibility
    deleteFromBlob,
    isCloudStorageConfigured,
    convertDataToCsv,
    parseCsvContent,
    initializeDemoData,
    getDataWithInit
}; 