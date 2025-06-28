const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendAnmeldungMail } = require('./sendMail');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

if (process.env.NODE_ENV !== 'production' && (!FRONTEND_ORIGIN)) {
  app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:4000"],
    credentials: false
  }));
  console.log('CORS für Entwicklung: localhost:3000 und localhost:4000 erlaubt');
} else if (FRONTEND_ORIGIN) {
  app.use(cors({
    origin: FRONTEND_ORIGIN,
    credentials: false
  }));
  console.log(`CORS aktiviert für Origin: ${FRONTEND_ORIGIN}`);
} else {
  app.use(cors());
  console.log('CORS ist offen (keine Origin-Beschränkung, FRONTEND_ORIGIN nicht gesetzt)');
}

app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/anmeldung', (req, res) => {
  const { formData, signatureDataUrl } = req.body;
  sendAnmeldungMail(formData, signatureDataUrl, (err, info) => {
    if (err) {
      console.error('E-Mail Fehler:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, info });
  });
});

// Statische Auslieferung des Frontends
app.use(express.static(path.join(__dirname, 'build')));

// Fallback für Single Page Application (React Router)
// Entferne diese Zeile, da sie mit path-to-regexp Probleme macht
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

const configDir = process.env.CONFIG_DIR || path.join(__dirname, 'config');
const keyPath = path.join(configDir, 'server.key');
const certPath = path.join(configDir, 'server.cert');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const https = require('https');
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`Backend läuft über HTTPS auf https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Backend läuft auf http://localhost:${PORT}`);
  });
}
