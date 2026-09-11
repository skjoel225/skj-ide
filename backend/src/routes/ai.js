const express = require('express');
const { Readable } = require('stream');
const router = express.Router();
const deepseekService = require('../services/deepseekService');

router.post('/chat', async (req, res) => {
  try {
    const { messages, tools } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Messages array is required.' }
      });
    }

    const deepseekRes = await deepseekService.sendMessage(messages, tools);
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the stream directly to the client
    if (deepseekRes.body && typeof deepseekRes.body.pipe === 'function') {
      deepseekRes.body.pipe(res);
    } else if (deepseekRes.body) {
      Readable.fromWeb(deepseekRes.body).pipe(res);
    } else {
      res.end();
    }
    
    req.on('close', () => {
      // Clean up if connection is closed early
    });
  } catch (error) {
    console.error('[AI] Request error:', error.message);
    
    if (error.message === 'OFFLINE_ERROR') {
      return res.status(503).json({
        success: false,
        error: { code: 'OFFLINE_ERROR', message: 'Le service IA est temporairement indisponible (Problème réseau).' }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Erreur interne du serveur.' }
    });
  }
});

router.get('/test', async (req, res) => {
  try {
    await deepseekService.testConnection();
    res.json({ success: true, status: 'Connection OK' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'CONNECTION_ERROR', message: error.message }
    });
  }
});

module.exports = router;
