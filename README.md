# 📊 Streaming Word Cloud

A real-time word cloud visualization web application that reads from local CSV files and dynamically updates as your data changes. Perfect for live feedback, social media monitoring, survey responses, or any text data you want to visualize.

## ✨ Features

- **Real-time Updates**: Automatically checks your CSV file for changes every 5 seconds
- **Beautiful UI**: Modern, responsive design with gradient backgrounds and smooth animations
- **Smart Filtering**: Automatically removes common stop words and short words
- **Interactive**: Hover over words to see their frequency count
- **Customizable**: Easy to modify word filtering and styling
- **Mobile Friendly**: Responsive design works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- A CSV file with text data

### 1. Clone and Install

```bash
git clone <your-repo>
cd streaming-word-cloud
npm install
```

### 2. Set Up Your CSV File

1. Create a CSV file with text data in the `data/` directory
2. The app comes with a sample file: `data/sample_data.csv`
3. You can replace it with your own data or create a new file

### 3. Configure Your Data Source (Optional)

You can optionally customize the CSV file path:

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update the CSV file path if needed:**
   ```
   CSV_FILE_PATH=data/your_data.csv
   PORT=3000
   ```

### 4. Run the Application

```bash
npm start
```

Open your browser and go to `http://localhost:3000`

The application will start immediately and be accessible without any authentication.

## 📝 Usage

### Preparing Your CSV File

The application reads all text from your CSV file and creates a word cloud. You can:

- Use any number of columns with text data
- Add new rows anytime - the app will automatically detect changes
- Mix text with other data types (numbers will be filtered out)
- Use headers or no headers - both work fine

### Example CSV Structure

```csv
feedback,comments,notes,category
"Great service!","Very helpful staff","Quick response","positive"
"Excellent quality","Would recommend","Outstanding support","positive"
"Needs improvement","Could be better","Average experience","neutral"
```

### Customizing Word Filtering

The application automatically filters out:
- Common English stop words (the, and, is, etc.)
- Words shorter than 3 characters
- Pure numbers
- Punctuation

To customize the filtering, edit the `STOP_WORDS` set in `server.js`.

## 🎨 Customization

### Styling

Modify `public/styles.css` to change:
- Colors and gradients
- Font sizes and families
- Layout and spacing
- Animations and transitions

### Word Cloud Parameters

Edit `public/wordcloud.js` to adjust:
- Word cloud dimensions
- Color schemes
- Font size ranges
- Rotation angles
- Update intervals

### Backend Processing

Modify `server.js` to change:
- CSV file path and processing logic
- Text processing algorithms
- API endpoints
- Polling intervals
- Error handling

## 🔧 API Endpoints

- `GET /` - Main application page
- `GET /api/wordcloud-data` - Returns processed word cloud data
- `GET /api/question-types-data` - Returns question types analysis  
- `GET /api/sentiment-data` - Returns sentiment analysis
- `GET /api/health` - Health check endpoint

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🚨 Troubleshooting

### Common Issues

1. **Server connection issues**
   - Make sure the server is running on the correct port
   - Try accessing http://127.0.0.1:3000 instead of localhost
   - Check if port 3000 is already in use

2. **"Failed to load data" error**
   - Check that your CSV file exists at the specified path
   - Verify the CSV_FILE_PATH in your .env file is correct
   - Ensure the CSV file is properly formatted
   - Check file permissions (make sure the app can read the file)

3. **Empty word cloud**
   - Verify there's text data in your CSV file
   - Check that your CSV file isn't empty
   - Ensure at least some columns contain text (not just numbers)

4. **File not updating**
   - Make sure you're editing the correct CSV file
   - Check the polling interval in your .env file
   - Restart the server if changes aren't being detected

### Debug Mode

Set `NODE_ENV=development` to see detailed error logs:

```bash
NODE_ENV=development npm start
```

## 🔒 Security Notes

- **No Authentication Required**: All endpoints are publicly accessible
- **CSV files are stored locally** on the server
- **Data processing happens locally** on your machine  
- **Environment Variables**: Keep your `.env` file secure and never commit it to version control
- Consider file permissions if using sensitive data

## 🌟 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [D3.js](https://d3js.org/) for powerful data visualization
- [Jason Davies' word cloud layout](https://github.com/jasondavies/d3-cloud) for the word cloud algorithm
- [csv-parser](https://github.com/mafintosh/csv-parser) for CSV file processing 