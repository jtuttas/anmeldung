const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendAnmeldungMail } = require('./sendMail');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
