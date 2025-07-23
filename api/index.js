const path = require('path');
const fs = require('fs');

module.exports = function handler(req, res) {
  // Serve the main HTML file
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve index.html' });
  }
};