const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

/**
 * Upload CSV data to AWS S3
 */
async function uploadToS3(data, filename = null) {
    if (!process.env.AWS_S3_BUCKET) {
        throw new Error('AWS_S3_BUCKET environment variable not configured');
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const key = filename || `wordcloud-data-${Date.now()}.csv`;
    
    // Convert data to CSV string
    const csvContent = convertDataToCsv(data);
    
    const params = {
        Bucket: bucket,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
        Metadata: {
            'upload-timestamp': new Date().toISOString(),
            'record-count': data.length.toString(),
            'source': 'wordcloud-app'
        }
    };

    try {
        const result = await s3.upload(params).promise();
        
        return {
            success: true,
            location: result.Location,
            key: result.Key,
            bucket: result.Bucket,
            url: `https://${bucket}.s3.amazonaws.com/${key}`,
            metadata: {
                uploadTime: new Date().toISOString(),
                recordCount: data.length,
                fileSize: Buffer.byteLength(csvContent, 'utf8')
            }
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error(`Failed to upload to S3: ${error.message}`);
    }
}

/**
 * Download CSV data from AWS S3
 */
async function downloadFromS3(key) {
    if (!process.env.AWS_S3_BUCKET) {
        throw new Error('AWS_S3_BUCKET environment variable not configured');
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
    };

    try {
        const result = await s3.getObject(params).promise();
        const csvContent = result.Body.toString('utf-8');
        const data = parseCsvContent(csvContent);
        
        return {
            success: true,
            data: data,
            metadata: {
                lastModified: result.LastModified,
                contentLength: result.ContentLength,
                etag: result.ETag
            }
        };
    } catch (error) {
        console.error('S3 download error:', error);
        throw new Error(`Failed to download from S3: ${error.message}`);
    }
}

/**
 * List all CSV files in the S3 bucket
 */
async function listS3Files() {
    if (!process.env.AWS_S3_BUCKET) {
        throw new Error('AWS_S3_BUCKET environment variable not configured');
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Prefix: 'wordcloud-data-'
    };

    try {
        const result = await s3.listObjectsV2(params).promise();
        
        return {
            success: true,
            files: result.Contents.map(obj => ({
                key: obj.Key,
                size: obj.Size,
                lastModified: obj.LastModified,
                url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${obj.Key}`
            }))
        };
    } catch (error) {
        console.error('S3 list error:', error);
        throw new Error(`Failed to list S3 files: ${error.message}`);
    }
}

/**
 * Get the latest CSV file from S3
 */
async function getLatestFromS3() {
    try {
        const fileList = await listS3Files();
        
        if (!fileList.success || fileList.files.length === 0) {
            return { success: false, error: 'No files found in S3' };
        }

        // Sort by last modified date, get the newest
        const latestFile = fileList.files.sort((a, b) => 
            new Date(b.lastModified) - new Date(a.lastModified)
        )[0];

        const data = await downloadFromS3(latestFile.key);
        
        return {
            success: true,
            data: data.data,
            file: latestFile,
            metadata: data.metadata
        };
    } catch (error) {
        console.error('Error getting latest S3 file:', error);
        throw new Error(`Failed to get latest file: ${error.message}`);
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
    const { filename, provider = 'aws' } = options;
    
    switch (provider.toLowerCase()) {
        case 'aws':
        case 's3':
            return await uploadToS3(data, filename);
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
    return !!(
        process.env.AWS_S3_BUCKET &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
    );
}

module.exports = {
    uploadToCloud,
    uploadToS3,
    downloadFromS3,
    listS3Files,
    getLatestFromS3,
    isCloudStorageConfigured,
    convertDataToCsv,
    parseCsvContent
}; 