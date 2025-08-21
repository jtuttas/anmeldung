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
    // Logo oben rechts einfügen
    let logoY = 40;
    try {
      const logoPath = path.join(__dirname, 'src/log.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width - 170, logoY, {width: 120});
      }
    } catch (e) {}

    // Text auf Höhe des Logos, linksbündig, Schriftgröße 10
    doc.fontSize(10);
    doc.text(
      'Pro MMBbS -Förderverein der Multi Media Berufsbildenden \nSchulen der Region Hannover e.V.\nPro MMBBS, Expo Plaza 3, 30539 Hannover, pro@mmbbs.de',
      80,
      logoY,
      {
        width: doc.page.width - 200,
        align: 'left'
      }
    );

  // Absenderzeile oberhalb des Adressfelds (Schriftgröße 8)
  doc.fontSize(8);
  doc.text(`${formData.name || ''}, ${formData.strasse || ''}, ${formData.plzort || ''}`, 80, 135, {
    width: 200,
    align: 'left'
  });

  // Empfängeradresse DIN-konform (Fensterumschlag)
  doc.fontSize(12);
  doc.text('Pro MMBBS e.V.\nExpo Plaza 3\n30539 Hannover', 80, 160, {
    width: 200,
    align: 'left'
  });

    // Abstand zum Brieftext
    doc.moveDown(5);
    

    // Titel und Einleitung
    doc
      .fontSize(16)
      .text(
        "Mitgliedsanmeldung Förderverein Pro MMBbS - Förderverein der Multi Media Berufsbildenden Schulen Hannover e. V."
      );
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text('Hiermit melde ich mich verbindlich als Mitglied im Förderverein „Pro MMBbS“ e. V. an.');
    doc.moveDown();

    // Persönliche Angaben
    doc.text('Persönliche Angaben:', { underline: true });
    doc.text(`Mitgliedstyp: ${formData.mitgliedstyp || ''}`);
    doc.text(`Name: ${formData.name || ''}`);
    if (formData.ansprechpartner) {
      doc.text(`Ansprechpartner: ${formData.ansprechpartner}`);
    }
    doc.text(`Straße: ${formData.strasse || ''}`);
    doc.text(`PLZ, Ort: ${formData.plzort || ''}`);
    doc.text(`Telefon: ${formData.telefon || ''}`);
    doc.text(`E-Mail: ${formData.email || ''}`);
    doc.text(`Geburtsdatum: ${formData.geburtsdatum || ''}`);
    doc.moveDown();

    // Mitgliedsbeitrag
    doc.text('Mitgliedsbeitrag:', { underline: true });
    // Prüfe, ob ein freiwilliger Beitrag gesetzt ist und gültig ist
    const beitragFreiNum = Number(formData.beitragFrei);
    if (beitragFreiNum && beitragFreiNum > Number(formData.beitrag)) {
      doc.text(`Beitrag: ${beitragFreiNum} EUR (freiwillig)`);
    } else {
      doc.text(`Beitrag: ${formData.beitrag || ''} EUR`);
    }
    doc.moveDown();

    // SEPA-Lastschriftmandat
    doc.text('SEPA-Lastschriftmandat:', { underline: true });
    doc.text('Gläubiger-Identifikationsnummer: DE33ZZZ00002835849');
    doc.text(`Kontoinhaber: ${formData.kontoinhaber || ''}`);
    doc.text(`IBAN: ${formData.iban || ''}`);
    doc.text(`BIC: ${formData.bic || ''}`);
    doc.text(`Kreditinstitut: ${formData.kreditinstitut || ''}`);
    doc.moveDown();
    doc.text(`${formData.ort || ""} den ${formData.datum || ""}`);
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();


    // Unterschriftsbereich für SEPA
    doc.text('______________________________', 80, doc.y);
    doc.text('Unterschrift für SEPA-Lastschriftmandat', 80, doc.y);
    doc.moveDown(2);

    // Fußzeile (zweizeilig, weiter oben)
    doc.fontSize(8);
    const footerY1 = doc.page.height - 80;
    const footerY2 = doc.page.height - 65;
    doc.text('Hannoversche Volksbank IBAN: DE51 2519 0001 0445 1406 00  BIC: VOHADE2H Vereinsregister-Nr.: 204184', 50, footerY1, {
      width: doc.page.width - 100,
      align: 'center'
    });
    doc.text('Vorstand: Rainer Horn, Ingmar Vater, Silvan Ziemdorff', 50, footerY2, {
      width: doc.page.width - 100,
      align: 'center'
    });
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
  // Zieladresse: Verein und Formularadresse
  const empfaenger = [secrets.from];
  if (formData.email) {
    empfaenger.push(formData.email);
  }
  createAnmeldungPDF(formData, signatureDataUrl).then((pdfBuffer) => {
    const mailOptions = {
      from: secrets.from,
      to: empfaenger,
      subject: 'Neue Anmeldung Förderverein Pro MMBbS',
      text: emailText,
      attachments: [
        {
          filename: 'Anmeldung.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    // Unterschrift als Bild NICHT mehr anhängen
    // if (signatureDataUrl) {
    //   mailOptions.attachments.push({
    //     filename: 'unterschrift.png',
    //     content: signatureDataUrl.split(',')[1],
    //     encoding: 'base64',
    //     contentType: 'image/png'
    //   });
    // }
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
