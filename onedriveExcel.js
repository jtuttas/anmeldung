const fs = require('fs');
const path = require('path');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const fetch = require('node-fetch');
const configDir = process.env.CONFIG_DIR || path.join(__dirname, 'config');
const secrets = JSON.parse(fs.readFileSync(path.join(configDir, 'secrets.json'), 'utf8'));

const EXCEL_FILENAME = 'prommbbs_anmeldungen.xlsx';
const EXCEL_FOLDER = '/Temp';

async function getAccessToken() {
  const msalConfig = {
    auth: {
      clientId: secrets.onedrive_client_id,
      authority: `https://login.microsoftonline.com/${secrets.onedrive_tenant_id}`,
      clientSecret: secrets.onedrive_client_secret,
    },
  };
  const cca = new ConfidentialClientApplication(msalConfig);
  // KORREKT: Nur .default ODER einzelne Scopes, nicht beides!
  const result = await cca.acquireTokenByRefreshToken({
    refreshToken: secrets.onedrive_refresh_token,
    scopes: [
      'https://graph.microsoft.com/.default'
    ],
  });
  return result.accessToken;
}

async function ensureExcelFile(accessToken) {
  // Prüfe, ob Datei existiert
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}`;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if ([404, 410, 400, 403].includes(res.status)) {
    console.log(`Excel-Datei nicht vorhanden oder gelöscht (Status: ${res.status}), lege neu an...`);
    // Datei anlegen (leere Excel-Datei mit Sheet1 und Header)
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [
        'Mitgliedstyp', 'Name', 'Ansprechpartner', 'Straße', 'PLZ, Ort', 'Telefon', 'E-Mail', 'Geburtsdatum', 'Beitrag', 'Freiwilliger Beitrag', 'Kontoinhaber', 'IBAN', 'BIC', 'Kreditinstitut', 'Ort', 'Datum', 'Datenschutz', 'Kopie an E-Mail', 'Unterschrift (PNG-Base64)'
      ]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/content`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: xlsxBuffer,
    });
    console.log('Excel-Datei wurde neu angelegt, Upload-Status:', uploadRes.status);
    // Warte 7 Sekunden, damit OneDrive/Graph die Datei und das Workbook bereitstellt
    let ready = false;
    for (let i = 0; i < 7; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Prüfe, ob das Workbook bereit ist
      const workbookUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook`;
      const checkRes = await fetch(workbookUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (checkRes.status === 200) {
        ready = true;
        break;
      }
      console.log('Warte auf Workbook, Versuch', i + 1, 'Status:', checkRes.status);
    }
    if (!ready) {
      throw new Error('Excel-Workbook konnte nach Neuanlage nicht gefunden werden!');
    }
  } else {
    console.log(`Excel-Datei existiert (Status: ${res.status})`);
  }
}

async function appendToExcel(formData, signatureDataUrl) {
  const accessToken = await getAccessToken();
  await ensureExcelFile(accessToken);
  // Hole Tabellen-Id
  const tableUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/worksheets('Sheet1')/tables`;
  let res = await fetch(tableUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  let tables = await res.json();
  let tableId;
  const expectedColumns = [
    'Mitgliedstyp', 'Name', 'Ansprechpartner', 'Straße', 'PLZ, Ort', 'Telefon', 'E-Mail', 'Geburtsdatum', 'Beitrag', 'Freiwilliger Beitrag', 'Kontoinhaber', 'IBAN', 'BIC', 'Kreditinstitut', 'Ort', 'Datum', 'Datenschutz', 'Kopie an E-Mail', 'Unterschrift (PNG-Base64)'
  ];
  if (tables.value && tables.value.length > 0) {
    tableId = tables.value[0].id;
    // Prüfe die Spaltenanzahl
    const columnsUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/tables/${tableId}/columns`;
    const columnsRes = await fetch(columnsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const columnsData = await columnsRes.json();
    const actualColumns = columnsData.value.map(col => col.name);
    if (actualColumns.length !== expectedColumns.length || !actualColumns.every((c, i) => c === expectedColumns[i])) {
      // Lösche die Tabelle und lege sie neu an
      const deleteTableUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/tables/${tableId}`;
      await fetch(deleteTableUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      // Ermittle Range dynamisch (A1 bis passender Spalte)
      const lastCol = String.fromCharCode('A'.charCodeAt(0) + expectedColumns.length - 1);
      const address = `Sheet1!A1:${lastCol}1`;
      const addTableUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/worksheets('Sheet1')/tables/add`;
      res = await fetch(addTableUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          hasHeaders: true,
        }),
      });
      const table = await res.json();
      tableId = table.id;
      console.log('Tabelle wurde wegen Spaltenanzahl neu angelegt.');
    }
  } else {
    // Tabelle anlegen (ganze Sheet1 als Tabelle)
    const lastCol = String.fromCharCode('A'.charCodeAt(0) + expectedColumns.length - 1);
    const address = `Sheet1!A1:${lastCol}1`;
    const addTableUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/worksheets('Sheet1')/tables/add`;
    res = await fetch(addTableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        hasHeaders: true,
      }),
    });
    const table = await res.json();
    tableId = table.id;
  }
  // Datensatz anhängen
  const addRowUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/tables/${tableId}/rows/add`;
  const addRowBody = {
    values: [[
      formData.mitgliedstyp || '',
      formData.name || '',
      formData.ansprechpartner || '',
      formData.strasse || '',
      formData.plzort || '',
      formData.telefon || '',
      formData.email || '',
      formData.geburtsdatum || '',
      formData.beitrag || '',
      formData.beitragFrei || '',
      formData.kontoinhaber || '',
      formData.iban || '',
      formData.bic || '',
      formData.kreditinstitut || '',
      formData.ort || '',
      formData.datum || '',
      formData.datenschutz ? 'Ja' : 'Nein',
      formData.emailCopy ? 'Ja' : 'Nein',
      signatureDataUrl ? signatureDataUrl.split(',')[1] : ''
    ]],
  };
  console.log('Füge Zeile in Excel ein:', JSON.stringify(addRowBody));
  const addRowRes = await fetch(addRowUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(addRowBody),
  });
  const addRowResult = await addRowRes.text();
  console.log('Antwort von addRow:', addRowRes.status, addRowResult);
  if (!addRowRes.ok) {
    throw new Error('Fehler beim Hinzufügen der Zeile in Excel: ' + addRowResult);
  }
}

module.exports = { appendToExcel };
