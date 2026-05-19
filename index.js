const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'audio-converter', version: '2.1.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint principal: recibe audio en cualquier formato, devuelve OGG/Opus para nota de voz WhatsApp
app.post('/convert', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${Date.now()}.ogg`);

  console.log(`Converting: ${inputPath} -> ${outputPath}`);

  ffmpeg(inputPath)
    .audioCodec('libopus')
    .audioBitrate('64k')
    .audioChannels(1)
    .audioFrequency(48000)
    .format('ogg')
    .outputOptions([
      '-application audio',
      '-vbr on',
      '-compression_level 10',
      '-page_duration 20000',
      '-frame_duration 60'
    ])
    .on('end', () => {
      console.log('Conversion to OGG/Opus completed');
      
      res.setHeader('Content
