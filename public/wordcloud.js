class WordCloudApp {
    constructor() {
        this.autoRefreshInterval = null;
        this.lastTimestamp = null;
        this.currentUploadData = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeElements();
        this.attachEventListeners();
        this.startApplication();
    }





    initializeElements() {
        this.wordCloudElement = document.getElementById('wordCloud');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.autoRefreshCheckbox = document.getElementById('autoRefresh');
        this.verbsOnlyCheckbox = document.getElementById('verbsOnly');
        this.questionTypesCheckbox = document.getElementById('questionTypes');
        this.sentimentAnalysisCheckbox = document.getElementById('sentimentAnalysis');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Settings panel elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.applySettingsBtn = document.getElementById('applySettings');
        this.resetSettingsBtn = document.getElementById('resetSettings');
        
        // Upload panel elements
        this.uploadBtn = document.getElementById('uploadBtn');
        this.uploadPanel = document.getElementById('uploadPanel');
        this.closeUploadBtn = document.getElementById('closeUpload');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.csvFile = document.getElementById('csvFile');
        this.csvTextInput = document.getElementById('csvTextInput');
        this.uploadDataBtn = document.getElementById('uploadDataBtn');
        this.previewDataBtn = document.getElementById('previewDataBtn');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.uploadResults = document.getElementById('uploadResults');
        this.uploadStats = document.getElementById('uploadStats');
        this.dataPreview = document.getElementById('dataPreview');
        this.previewTable = document.getElementById('previewTable');
        
        // Settings controls
        this.settingsControls = {
            includeBase: document.getElementById('includeBase'),
            includePast: document.getElementById('includePast'),
            includeGerund: document.getElementById('includeGerund'),
            includePastParticiple: document.getElementById('includePastParticiple'),
            includePresentNon3rd: document.getElementById('includePresentNon3rd'),
            includePresent3rd: document.getElementById('includePresent3rd'),
            includeModals: document.getElementById('includeModals'),
            minLength: document.getElementById('minLength'),
            allowContractions: document.getElementById('allowContractions'),
            strictStopWords: document.getElementById('strictStopWords')
        };
    }

    attachEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.fetchAndUpdateWordCloud());
        
        this.autoRefreshCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        this.verbsOnlyCheckbox.addEventListener('change', () => {
            // Uncheck other modes if verbs is selected
            if (this.verbsOnlyCheckbox.checked) {
                this.questionTypesCheckbox.checked = false;
                this.sentimentAnalysisCheckbox.checked = false;
            }
            // Refresh word cloud when filter changes
            this.fetchAndUpdateWordCloud();
        });

        this.questionTypesCheckbox.addEventListener('change', () => {
            // Uncheck other modes if question types is selected
            if (this.questionTypesCheckbox.checked) {
                this.verbsOnlyCheckbox.checked = false;
                this.sentimentAnalysisCheckbox.checked = false;
            }
            // Refresh word cloud when filter changes
            this.fetchAndUpdateWordCloud();
        });

        this.sentimentAnalysisCheckbox.addEventListener('change', () => {
            // Uncheck other modes if sentiment analysis is selected
            if (this.sentimentAnalysisCheckbox.checked) {
                this.verbsOnlyCheckbox.checked = false;
                this.questionTypesCheckbox.checked = false;
            }
            // Refresh word cloud when filter changes
            this.fetchAndUpdateWordCloud();
        });

        // Settings panel event listeners
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        this.applySettingsBtn.addEventListener('click', () => this.applySettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());

        // Upload panel event listeners
        this.uploadBtn.addEventListener('click', () => this.showUpload());
        this.closeUploadBtn.addEventListener('click', () => this.hideUpload());
        
        // File upload listeners
        this.fileUploadArea.addEventListener('click', () => this.csvFile.click());
        this.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.csvFile.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Text input listener
        this.csvTextInput.addEventListener('input', () => this.handleTextInput());
        
        // Upload buttons
        this.uploadDataBtn.addEventListener('click', () => this.uploadData());
        this.previewDataBtn.addEventListener('click', () => this.previewData());

        // Preset buttons
        document.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
        });

        // Close panels when clicking outside
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.hideSettings();
            }
        });
        
        this.uploadPanel.addEventListener('click', (e) => {
            if (e.target === this.uploadPanel) {
                this.hideUpload();
            }
        });

    }

    async startApplication() {
        this.updateStatus('connecting', 'Connecting...');
        await this.fetchAndUpdateWordCloud();
        
        if (this.autoRefreshCheckbox.checked) {
            this.startAutoRefresh();
        }
    }

    async fetchAndUpdateWordCloud() {
        this.showLoading();
        this.updateStatus('loading', 'Loading...');

        try {
            // Check which mode is active
            const verbsOnly = this.verbsOnlyCheckbox.checked;
            const questionTypes = this.questionTypesCheckbox.checked;
            const sentimentAnalysis = this.sentimentAnalysisCheckbox.checked;
            let url;
            
            if (sentimentAnalysis) {
                // Use sentiment analysis endpoint
                url = `/api/sentiment-data`;
                console.log(`Fetching sentiment analysis word cloud: URL=${url}`);
            } else if (questionTypes) {
                // Use question types endpoint
                url = `/api/question-types-data`;
                console.log(`Fetching question types word cloud: URL=${url}`);
            } else if (verbsOnly) {
                // Use verbs-only endpoint with settings
                const settings = this.getVerbSettings();
                const params = new URLSearchParams({
                    verbs: 'true',
                    ...settings
                });
                url = `/api/wordcloud-data?${params.toString()}`;
                console.log(`Fetching verbs word cloud: URL=${url}`);
            } else {
                // Use default all-words endpoint
                url = `/api/wordcloud-data`;
                console.log(`Fetching all words cloud: URL=${url}`);
            }
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            console.log('API Response:', result);

            if (result.success && result.imagePath) {
                this.updateWordCloudImage(result.imagePath, result.timestamp);
                this.updateStatus('connected', 'Connected');
                this.hideLoading();
            } else {
                throw new Error(result.error || 'Failed to fetch data');
            }
        } catch (error) {
            console.error('Error fetching word cloud data:', error);
            this.showError();
            this.updateStatus('error', 'Connection Failed');
        }
    }

    updateWordCloudImage(imagePath, timestamp) {
        // Clear previous content
        this.wordCloudElement.innerHTML = '';
        
        // Create image element
        const img = document.createElement('img');
        img.src = imagePath + '?t=' + Date.now(); // Add current timestamp to prevent caching
        img.alt = 'Word Cloud';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        // Handle image load error
        img.onerror = () => {
            this.showError();
            this.updateStatus('error', 'Image Load Failed');
        };
        
        // Handle successful image load
        img.onload = () => {
            // Add fade-in animation
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
                img.style.opacity = '1';
            }, 100);
            
            // Initialize resize observer for responsive image scaling
            this.initializeResizeObserver(img);
        };
        
        this.wordCloudElement.appendChild(img);
    }

    initializeResizeObserver(img) {
        // Create a ResizeObserver to watch for container size changes
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Ensure image scales properly when container is resized
                if (img && img.parentElement) {
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    img.style.objectFit = 'contain';
                }
            }
        });
        
        // Start observing the word cloud container
        const container = document.querySelector('.word-cloud-container');
        if (container) {
            this.resizeObserver.observe(container);
        }
    }

    showEmptyState() {
        this.wordCloudElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 24px; font-family: Arial, sans-serif;">
                No data available
            </div>
        `;
    }

    showLoading() {
        this.loadingSpinner.style.display = 'flex';
        this.errorMessage.style.display = 'none';
        this.wordCloudElement.style.display = 'none';
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
        this.errorMessage.style.display = 'none';
        this.wordCloudElement.style.display = 'block';
    }

    showError() {
        this.loadingSpinner.style.display = 'none';
        this.errorMessage.style.display = 'block';
        this.wordCloudElement.style.display = 'none';
    }

    updateStatus(status, message) {
        this.statusText.textContent = message;
        this.statusDot.className = 'status-dot';
        
        if (status === 'connected') {
            this.statusDot.classList.add('connected');
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        this.autoRefreshInterval = setInterval(() => {
            this.fetchAndUpdateWordCloud();
        }, 20000); // Refresh every 20 seconds
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // Settings panel methods
    showSettings() {
        this.settingsPanel.style.display = 'block';
    }

    hideSettings() {
        this.settingsPanel.style.display = 'none';
    }

    getVerbSettings() {
        return {
            includeBase: this.settingsControls.includeBase.checked,
            includePast: this.settingsControls.includePast.checked,
            includeGerund: this.settingsControls.includeGerund.checked,
            includePastParticiple: this.settingsControls.includePastParticiple.checked,
            includePresentNon3rd: this.settingsControls.includePresentNon3rd.checked,
            includePresent3rd: this.settingsControls.includePresent3rd.checked,
            includeModals: this.settingsControls.includeModals.checked,
            minLength: this.settingsControls.minLength.value,
            allowContractions: this.settingsControls.allowContractions.checked,
            strictStopWords: this.settingsControls.strictStopWords.checked
        };
    }

    applySettings() {
        this.hideSettings();
        if (this.verbsOnlyCheckbox.checked) {
            this.fetchAndUpdateWordCloud();
        }
    }

    resetSettings() {
        // Reset to default values
        this.settingsControls.includeBase.checked = true;
        this.settingsControls.includePast.checked = true;
        this.settingsControls.includeGerund.checked = true;
        this.settingsControls.includePastParticiple.checked = true;
        this.settingsControls.includePresentNon3rd.checked = true;
        this.settingsControls.includePresent3rd.checked = true;
        this.settingsControls.includeModals.checked = false;
        this.settingsControls.minLength.value = 3;
        this.settingsControls.allowContractions.checked = false;
        this.settingsControls.strictStopWords.checked = true;
    }

    applyPreset(preset) {
        switch (preset) {
            case 'inclusive':
                // More inclusive - catch more verbs
                this.settingsControls.includeBase.checked = true;
                this.settingsControls.includePast.checked = true;
                this.settingsControls.includeGerund.checked = true;
                this.settingsControls.includePastParticiple.checked = true;
                this.settingsControls.includePresentNon3rd.checked = true;
                this.settingsControls.includePresent3rd.checked = true;
                this.settingsControls.includeModals.checked = true;
                this.settingsControls.minLength.value = 2;
                this.settingsControls.allowContractions.checked = true;
                this.settingsControls.strictStopWords.checked = false;
                break;
                
            case 'selective':
                // More selective - fewer, higher-quality verbs
                this.settingsControls.includeBase.checked = true;
                this.settingsControls.includePast.checked = true;
                this.settingsControls.includeGerund.checked = false;
                this.settingsControls.includePastParticiple.checked = false;
                this.settingsControls.includePresentNon3rd.checked = true;
                this.settingsControls.includePresent3rd.checked = true;
                this.settingsControls.includeModals.checked = false;
                this.settingsControls.minLength.value = 4;
                this.settingsControls.allowContractions.checked = false;
                this.settingsControls.strictStopWords.checked = true;
                break;
                
            case 'actions':
                // Action words only - focus on active verbs
                this.settingsControls.includeBase.checked = true;
                this.settingsControls.includePast.checked = true;
                this.settingsControls.includeGerund.checked = true;
                this.settingsControls.includePastParticiple.checked = false;
                this.settingsControls.includePresentNon3rd.checked = true;
                this.settingsControls.includePresent3rd.checked = true;
                this.settingsControls.includeModals.checked = false;
                this.settingsControls.minLength.value = 3;
                this.settingsControls.allowContractions.checked = false;
                this.settingsControls.strictStopWords.checked = true;
                break;
                
            case 'default':
                this.resetSettings();
                break;
        }
    }

    // Upload panel methods
    showUpload() {
        this.uploadPanel.style.display = 'block';
    }

    hideUpload() {
        this.uploadPanel.style.display = 'none';
        this.resetUploadPanel();
    }

    resetUploadPanel() {
        this.csvFile.value = '';
        this.csvTextInput.value = '';
        this.currentUploadData = null;
        this.uploadDataBtn.disabled = true;
        this.previewDataBtn.disabled = true;
        this.uploadProgress.style.display = 'none';
        this.uploadResults.style.display = 'none';
        this.dataPreview.style.display = 'none';
        this.fileUploadArea.classList.remove('dragover');
    }

    handleDragOver(e) {
        e.preventDefault();
        this.fileUploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.fileUploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.fileUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File size must be less than 10MB');
            return;
        }

        try {
            const text = await file.text();
            this.parseCsvData(text);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading file. Please try again.');
        }
    }

    handleTextInput() {
        const text = this.csvTextInput.value.trim();
        if (text) {
            this.parseCsvData(text);
        } else {
            this.currentUploadData = null;
            this.uploadDataBtn.disabled = true;
            this.previewDataBtn.disabled = true;
        }
    }

    parseCsvData(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                alert('CSV must have at least a header row and one data row');
                return;
            }

            // Parse headers
            const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
            
            // Check for required columns
            if (!headers.includes('Timestamp') || !headers.includes('Original Question')) {
                alert('CSV must contain "Timestamp" and "Original Question" columns');
                return;
            }

            // Parse data rows
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCsvLine(lines[i]);
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    
                    // Validate required fields
                    if (row.Timestamp && row['Original Question']) {
                        data.push(row);
                    }
                }
            }

            if (data.length === 0) {
                alert('No valid data rows found');
                return;
            }

            this.currentUploadData = data;
            this.uploadDataBtn.disabled = false;
            this.previewDataBtn.disabled = false;

            console.log(`Parsed ${data.length} valid rows`);
            
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV. Please check the format.');
        }
    }

    parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values.map(v => v.replace(/^["']|["']$/g, ''));
    }

    previewData() {
        if (!this.currentUploadData) return;

        const data = this.currentUploadData.slice(0, 10); // Show first 10 rows
        const headers = Object.keys(data[0]);

        let tableHtml = '<table><thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        data.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                const value = row[header] || '';
                const truncated = value.length > 50 ? value.substring(0, 47) + '...' : value;
                tableHtml += `<td title="${value}">${truncated}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        
        if (this.currentUploadData.length > 10) {
            tableHtml += `<p><small>Showing first 10 of ${this.currentUploadData.length} rows</small></p>`;
        }

        this.previewTable.innerHTML = tableHtml;
        this.dataPreview.style.display = 'block';
    }

    async uploadData() {
        if (!this.currentUploadData) return;

        const mode = document.querySelector('input[name="uploadMode"]:checked').value;
        
        try {
            this.showUploadProgress();
            this.setProgress(0, 'Preparing upload...');

            this.setProgress(25, 'Uploading data...');

            const response = await fetch('/api/upload-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    csvData: this.currentUploadData,
                    mode: mode
                })
            });

            this.setProgress(75, 'Processing...');

            const result = await response.json();

            this.setProgress(100, 'Complete!');

            if (result.success) {
                this.showUploadResults(result);
                
                // Refresh word cloud after successful upload
                setTimeout(() => {
                    this.fetchAndUpdateWordCloud();
                }, 1000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            alert('Upload failed: ' + error.message);
        }
    }

    showUploadProgress() {
        this.uploadProgress.style.display = 'block';
    }

    hideUploadProgress() {
        this.uploadProgress.style.display = 'none';
    }

    setProgress(percent, text) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = text;
    }

    showUploadResults(result) {
        this.hideUploadProgress();
        
        const stats = result.stats;
        
        this.uploadStats.innerHTML = `
            <div class="stat-item">
                <div class="stat-number">${stats.totalReceived}</div>
                <div class="stat-label">Received</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.newRecordsAdded}</div>
                <div class="stat-label">Added</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.duplicatesSkipped}</div>
                <div class="stat-label">Duplicates</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.totalRecords}</div>
                <div class="stat-label">Total Records</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.cloudUpload === 'success' ? '✅' : '⏭️'}</div>
                <div class="stat-label">Cloud Backup</div>
            </div>
        `;
        
        this.uploadResults.style.display = 'block';
    }

}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WordCloudApp();
});

// Fallback initialization in case DOMContentLoaded doesn't fire
window.addEventListener('load', () => {
    if (!window.wordCloudAppInitialized) {
        new WordCloudApp();
        window.wordCloudAppInitialized = true;
    }
});