const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors()); // Configure according to your needs
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protect AI routes with our token verification
app.use('/api/ai', authMiddleware, aiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend SKJ IDE is running on port ${PORT}`);
});
