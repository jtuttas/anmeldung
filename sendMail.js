const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');
const { appendToExcel } = require('./onedriveExcel');
const { PDFDocument: PDFLibDocument, rgb } = require('pdf-lib');

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

    // Briefkopf: Absender (klein) und Adressat (groß)
    // Absender (Schriftgröße 10)
    doc.fontSize(8).text(
      `${formData.name || ''}, ${formData.strasse || ''}, ${formData.plzort || ''}`,
      50,
      logoY + 100,
      { width: 300 }
    );
    // Adressat (Schriftgröße 12)
    doc.fontSize(12).text('Pro MMBBS e.V.', 50, logoY + 130);
    doc.text('Expo Plaza 3', 50, doc.y);
    doc.text('30539 Hannover', 50, doc.y);

    // SEPA-Lastschriftformular
    doc.moveDown(5);
    const sepaTitleY = doc.y;
    doc.fontSize(14).text('SEPA-Lastschriftmandat', 50, sepaTitleY);

    // Boxen direkt unter der Überschrift platzieren
    const boxStartY = doc.y + 10;
    const block1X = 50, block1Y = boxStartY, block1W = doc.page.width - 100, block1H = 90;
    doc.fontSize(8);
    doc.rect(block1X, block1Y, block1W, block1H).stroke();
    let mandatsDatum = formData.datum ? formData.datum.replace(/-/g, '') : '';
    let ibanSum = 0;
    if (formData.iban) {
      for (const c of formData.iban.replace(/\D/g, '')) ibanSum += parseInt(c);
    }
    let mandatsRef = `${mandatsDatum}${ibanSum}`;
    doc.font('Helvetica-Bold').fontSize(10).text('Zahlungsempfänger (Gläubiger):', block1X + 10, block1Y + 10);
    doc.font('Helvetica').fontSize(10).text('Förderverein der Multi Media Berufsbildenden Schulen der Region Hannover e.V.', block1X + 10, block1Y + 28);
    doc.text('Pro MMBbS', block1X + 10, block1Y + 43);
    doc.text('Expo Plaza 3', block1X + 10, block1Y + 58);
    doc.text('30539 Hannover', block1X + 10, block1Y + 73);
    doc.text('Gläubiger-Identifikationsnummer: DE33ZZZ00002835849', block1X + block1W/2 - 50, block1Y + 58);
    doc.text(`Mandatsreferenz: ${mandatsRef}`, block1X + block1W/2 - 50, block1Y + 73);

    // Block: Zahlungspflichtiger (Kontoinhaber)
    const block2Y = block1Y + block1H + 20, block2H = 100;
    doc.rect(block1X, block2Y, block1W, block2H).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('Zahlungspflichtiger (Kontoinhaber):', block1X + 10, block2Y + 10);
    doc.font('Helvetica').fontSize(10).text(`${formData.kontoinhaber || formData.name || ''}`, block1X + 10, block2Y + 28);
    doc.text(`${formData.strasse || ''}`, block1X + 10, block2Y + 43);
    doc.text(`${formData.plzort || ''}`, block1X + 10, block2Y + 58);
    doc.text(`IBAN: ${formData.iban || ''}`, block1X + 10, block2Y + 73);
    doc.text(`BIC: ${formData.bic || ''}`, block1X + 10, block2Y + 88);

    doc.moveDown(3);
    doc.text(
      "Ich ermächtige den Förderverein Pro MMBbS e.V., jährlich wiederkehrende Zahlungen von meinem Konto mittels SEPA-Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von Pro MMBbS auf mein Konto gezogenen SEPA-Lastschriften einzulösen.",
      block1X,
      doc.y,
      { width: block1W }
    );
    doc.moveDown();
    doc.text('Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrags verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen.', block1X, doc.y, {width: block1W});

    // Ort, Datum und Unterschrift
  let unterschriftY = doc.y + 40;
  doc.fontSize(10).text(`${formData.ort || ''} den ${formData.datum || ''}`, block1X, unterschriftY);
  // Linie für Unterschrift
  const strichX = block1X + block1W/2 + 60;
  const strichY = unterschriftY + 15;
  doc.text('Unterschrift:', block1X + block1W/2, unterschriftY);
  doc.moveTo(strichX, strichY).lineTo(strichX + 170, strichY).stroke();

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

async function addAddressToPdf(formData) {
  const pdfPath = path.join(__dirname, 'public', 'Spendenbescheinigung_2025.pdf');
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFLibDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const address = `${formData.name}\n${formData.strasse}\n${formData.plzort}`;

  firstPage.drawText(address, {
    x: 70,
    y: 650, // This might need adjustment
    size: 12,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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
  createAnmeldungPDF(formData, signatureDataUrl).then(async (pdfBuffer) => {
    const spendenbescheinigungWithAddress = await addAddressToPdf(formData);
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
