const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para archivos temporales
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Healthcheck
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'audio-converter', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint principal: recibe WEBM, devuelve MP3
app.post('/convert', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${Date.now()}.mp3`);

  console.log(`Converting: ${inputPath} -> ${outputPath}`);

  ffmpeg(inputPath)
    .audioCodec('libmp3lame')
    .audioBitrate('64k')
    .audioChannels(1)
    .audioFrequency(44100)
    .format('mp3')
    .on('end', () => {
      console.log('Conversion completed');
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="voice-note.mp3"');
      
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      
      stream.on('end', () => {
        // Limpiar archivos temporales
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on('error', (err) => {
      console.error('Conversion error:', err.message);
      fs.unlink(inputPath, () => {});
      res.status(500).json({ error: 'Conversion failed', detail: err.message });
    })
    .save(outputPath);
});

app.listen(PORT, () => {
  console.log(`Audio converter service running on port ${PORT}`);
});
