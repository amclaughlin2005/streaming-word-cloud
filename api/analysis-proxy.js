module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { type = 'wordcloud', verbs = 'false' } = req.query;
    
    console.log(`Analysis proxy called: type=${type}, verbs=${verbs}`);
    
    // Get data from Vercel Blob
    const cloudStorage = require('./cloud-storage');
    const dataResult = await cloudStorage.getDataWithInit();
    
    if (!dataResult.success || !dataResult.data) {
      return res.status(500).json({
        success: false,
        error: 'No data available',
        details: 'Could not load data from Vercel Blob'
      });
    }

    const data = dataResult.data;
    console.log(`Loaded ${data.length} records from Vercel Blob`);

    // Extract questions for processing
    const questions = data
      .map(row => row['Original Question'])
      .filter(q => q && q.trim())
      .slice(0, 1000); // Limit for performance

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No questions found',
        details: 'CSV data must contain "Original Question" column with data'
      });
    }

    let response;

    if (type === 'sentiment') {
      // Simple sentiment analysis (lightweight)
      response = await lightweightSentimentAnalysis(questions);
    } else if (type === 'question-types') {
      // Simple question type analysis (lightweight)  
      response = await lightweightQuestionTypes(questions);
    } else {
      // For word clouds, use external service or fallback
      const externalServiceUrl = process.env.ML_SERVICE_URL;
      
      if (externalServiceUrl) {
        // Call external ML service
        response = await callExternalMLService(externalServiceUrl, {
          type: 'wordcloud',
          questions: questions,
          verbs_only: verbs === 'true',
          settings: req.query
        });
      } else {
        // Fallback to simple word frequency
        response = await simpleWordCloud(questions, verbs === 'true');
      }
    }

    // Add metadata
    response.recordCount = data.length;
    response.questionsProcessed = questions.length;
    response.dataSource = 'vercel-blob';
    response.processingMethod = externalServiceUrl ? 'external-ml' : 'lightweight';

    res.status(200).json(response);

  } catch (error) {
    console.error('Analysis proxy error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Lightweight analysis functions
async function lightweightSentimentAnalysis(questions) {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'best', 'wonderful', 'fantastic', 'perfect', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'disappointing', 'broken', 'failed'];
  
  const sentiment = { positive: 0, negative: 0, neutral: 0 };
  
  questions.forEach(question => {
    const q = question.toLowerCase();
    const positiveScore = positiveWords.filter(word => q.includes(word)).length;
    const negativeScore = negativeWords.filter(word => q.includes(word)).length;
    
    if (positiveScore > negativeScore) sentiment.positive++;
    else if (negativeScore > positiveScore) sentiment.negative++;
    else sentiment.neutral++;
  });

  return {
    success: true,
    message: 'Sentiment analysis completed',
    data: sentiment,
    analysis: 'sentiment'
  };
}

async function lightweightQuestionTypes(questions) {
  const patterns = {
    'What': /\bwhat\b/i,
    'How': /\bhow\b/i,
    'Why': /\bwhy\b/i,
    'When': /\bwhen\b/i,
    'Where': /\bwhere\b/i,
    'Who': /\bwho\b/i,
    'Which': /\bwhich\b/i,
    'Can': /\b(can|could)\b/i,
    'Should': /\bshould\b/i,
    'Would': /\bwould\b/i,
    'Is': /\b(is|are)\b/i,
    'Do': /\b(do|does|did)\b/i
  };
  
  const types = {};
  Object.keys(patterns).forEach(key => types[key] = 0);
  types.Other = 0;
  
  questions.forEach(question => {
    let categorized = false;
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(question)) {
        types[type]++;
        categorized = true;
        break;
      }
    }
    if (!categorized) types.Other++;
  });

  return {
    success: true,
    message: 'Question types analysis completed',
    data: types,
    analysis: 'question-types'
  };
}

async function simpleWordCloud(questions, verbsOnly = false) {
  // Simple word frequency without heavy ML
  const text = questions.join(' ').toLowerCase();
  const words = text.match(/\b\w+\b/g) || [];
  
  // Simple stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'this', 'that', 'these', 'those']);
  
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // Get top words
  const topWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  return {
    success: true,
    message: 'Simple word frequency analysis completed',
    data: topWords,
    analysis: 'word-frequency',
    mode: verbsOnly ? 'verbs' : 'all',
    warning: 'Using simplified word frequency. For advanced word clouds, configure ML_SERVICE_URL'
  };
}

async function callExternalMLService(serviceUrl, payload) {
  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 25000 // 25 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`External service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('External ML service failed:', error);
    // Fallback to simple processing
    return await simpleWordCloud(payload.questions, payload.verbs_only);
  }
} 