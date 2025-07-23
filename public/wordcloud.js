class WordCloudApp {
    constructor() {
        this.autoRefreshInterval = null;
        this.lastTimestamp = null;
        
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

        // Preset buttons
        document.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
        });

        // Close settings when clicking outside
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.hideSettings();
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
            
            const response = await fetch(url);
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
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WordCloudApp();
});