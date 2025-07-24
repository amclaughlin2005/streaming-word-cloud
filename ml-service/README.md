# Word Cloud ML Service

Advanced machine learning service for word cloud generation with NLTK processing.

## Features

- **Advanced Word Clouds**: Full NLTK processing with verb filtering and POS tagging
- **Sentiment Analysis**: VADER sentiment analysis with detailed scoring
- **Question Type Analysis**: Advanced categorization with percentages
- **Beautiful Visualizations**: High-quality word cloud images

## API Endpoints

### Health Check
```
GET /health
```

### Generate Word Cloud
```
POST /wordcloud
{
  "questions": ["array of questions"],
  "verbs_only": true/false,
  "settings": { verb filtering settings }
}
```

### Sentiment Analysis
```
POST /sentiment
{
  "questions": ["array of questions"]
}
```

### Question Types
```
POST /question-types
{
  "questions": ["array of questions"]
}
```

### Unified Analysis
```
POST /analyze
{
  "type": "wordcloud|sentiment|question-types",
  "questions": ["array of questions"],
  "verbs_only": true/false
}
```

## Deployment

This service is designed to be deployed on Railway.app as a companion to the main Vercel application. 