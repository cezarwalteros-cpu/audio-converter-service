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
  res.json({ status: 'ok', service: 'audio-converter', version: '2.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint principal: recibe WEBM, devuelve OGG/Opus (formato para nota de voz WhatsApp)
app.post('/convert', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${Date.now()}.ogg`);

  console.log(`Converting: ${inputPath} -> ${outputPath}`);

  ffmpeg(inputPath)
    .audioCodec('libopus')
    .audioBitrate('32k')
    .audioChannels(1)
    .audioFrequency(16000)
    .format('ogg')
    .outputOptions([
      '-application voip',
      '-vbr on',
      '-compression_level 10'
    ])
    .on('end', () => {
      console.log('Conversion to OGG/Opus completed');
      
      res.setHeader('Content-Type', 'audio/ogg');
      res.setHeader('Content-Disposition', 'attachment; filename="voice-note.ogg"');
      
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      
      stream.on('end', () => {
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
