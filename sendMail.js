const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');
const { appendToExcel } = require('./onedriveExcel');

const configDir = process.env.CONFIG_DIR || path.join(__dirname, 'config');
// Lade Secrets
const secrets = JSON.parse(fs.readFileSync(path.join(configDir, 'secrets.json'), 'utf8'));
console.log('Lade secrets:', secrets);

const transporter = nodemailer.createTransport({
  host: secrets.smtp_host,
  port: secrets.smtp_port,
  secure: false,
  auth: {
    user: secrets.smtp_user,
    pass: secrets.smtp_pass
  },
  logger: true, // Aktiviert Nodemailer-Logger
  debug: true   // Aktiviert SMTP-Debug-Ausgabe
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Verbindung fehlgeschlagen:', error);
  } else {
    console.log('SMTP Verbindung erfolgreich:', success);
  }
});

function createAnmeldungPDF(formData, signatureDataUrl) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    // Titel
    doc.fontSize(18).text('Mitgliedsanmeldung Förderverein „Pro MMBbS“ e. V.', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    // Persönliche Angaben
    doc.text('Persönliche Angaben:', { underline: true });
    doc.text(`Mitgliedstyp: ${formData.mitgliedstyp || ''}`);
    doc.text(`Name: ${formData.name || ''}`);
    doc.text(`Straße: ${formData.strasse || ''}`);
    doc.text(`PLZ, Ort: ${formData.plzort || ''}`);
    doc.text(`Telefon: ${formData.telefon || ''}`);
    doc.text(`E-Mail: ${formData.email || ''}`);
    doc.text(`Geburtsdatum: ${formData.geburtsdatum || ''}`);
    doc.moveDown();
    // Mitgliedsbeitrag
    doc.text('Mitgliedsbeitrag:', { underline: true });
    doc.text(`Beitrag: ${formData.beitrag || ''}`);
    if (formData.beitrag === 'frei') {
      doc.text(`Freiwilliger Beitrag: ${formData.beitragFrei || ''} EUR`);
    }
    doc.moveDown();
    // SEPA-Lastschriftmandat
    doc.text('SEPA-Lastschriftmandat:', { underline: true });
    doc.text(`Kontoinhaber: ${formData.kontoinhaber || ''}`);
    doc.text(`IBAN: ${formData.iban || ''}`);
    doc.text(`BIC: ${formData.bic || ''}`);
    doc.text(`Kreditinstitut: ${formData.kreditinstitut || ''}`);
    doc.text(`Ort: ${formData.ort || ''}`);
    doc.text(`Datum: ${formData.datum || ''}`);
    doc.moveDown();
    doc.text('Unterschrift:', { underline: true });
    // Unterschrift als Bild einfügen
    if (signatureDataUrl) {
      const img = signatureDataUrl.split(',')[1];
      const imgBuffer = Buffer.from(img, 'base64');
      doc.image(imgBuffer, { width: 200, height: 60 });
    } else {
      doc.text('(keine Unterschrift)');
    }
    doc.moveDown();
    doc.text('Datenschutz akzeptiert: ' + (formData.datenschutz ? 'Ja' : 'Nein'));
    doc.text('Kopie an E-Mail: ' + (formData.emailCopy ? 'Ja' : 'Nein'));
    doc.end();
  });
}

function sendAnmeldungMail(formData, signatureDataUrl, callback) {
  console.log('Sende E-Mail an:', formData.email);
  console.log('Formulardaten:', formData);
  if (signatureDataUrl) {
    console.log('Unterschrift vorhanden, Länge DataURL:', signatureDataUrl.length);
  } else {
    console.log('Keine Unterschrift übergeben.');
  }
  const emailTextPath = path.join(configDir, 'email_text.txt');
  const emailText = fs.readFileSync(emailTextPath, 'utf8');
  // Zieladresse immer aus secrets.json
  const empfaenger = secrets.from;
  // CC, falls gewünscht
  let cc = undefined;
  if (formData.emailCopy && formData.email) {
    cc = formData.email;
  }
  createAnmeldungPDF(formData, signatureDataUrl).then((pdfBuffer) => {
    const mailOptions = {
      from: secrets.from,
      to: empfaenger,
      subject: 'Neue Anmeldung Förderverein Pro MMBbS',
      text: emailText,
      attachments: [
        {
          filename: 'anmeldung.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    if (cc) {
      mailOptions.cc = cc;
    }
    if (signatureDataUrl) {
      mailOptions.attachments.push({
        filename: 'unterschrift.png',
        content: signatureDataUrl.split(',')[1],
        encoding: 'base64',
        contentType: 'image/png'
      });
    }
    console.log('MailOptions:', mailOptions);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Fehler beim Senden der E-Mail:', err);
      } else {
        console.log('E-Mail gesendet:', info);
      }
      // Nach E-Mail-Versand: Excel speichern
      appendToExcel(formData, signatureDataUrl).then(() => {
        console.log('Anmeldung in Excel gespeichert.');
        if (callback) callback(err, info);
      }).catch((excelErr) => {
        console.error('Fehler beim Speichern in Excel:', excelErr);
        if (callback) callback(err || excelErr, info);
      });
    });
  });
}

module.exports = { sendAnmeldungMail };
