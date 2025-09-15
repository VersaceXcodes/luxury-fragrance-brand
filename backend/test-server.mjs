import express from 'express';
const app = express();
const port = 8080;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
});