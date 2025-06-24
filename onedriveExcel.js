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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) {
    // Datei anlegen (leere Excel-Datei mit Sheet1 und Header)
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [
        'Mitgliedstyp', 'Name', 'Straße', 'PLZ, Ort', 'Telefon', 'E-Mail', 'Geburtsdatum', 'Beitrag', 'Freiwilliger Beitrag', 'Kontoinhaber', 'IBAN', 'BIC', 'Kreditinstitut', 'Ort', 'Datum', 'Datenschutz', 'Kopie an E-Mail', 'Unterschrift (PNG-Base64)'
      ]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/content`;
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: xlsxBuffer,
    });
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
  if (tables.value && tables.value.length > 0) {
    tableId = tables.value[0].id;
  } else {
    // Tabelle anlegen (ganze Sheet1 als Tabelle)
    const addTableUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/worksheets('Sheet1')/tables/add`;
    res = await fetch(addTableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 'Sheet1!A1:R1',
        hasHeaders: true,
      }),
    });
    const table = await res.json();
    tableId = table.id;
  }
  // Datensatz anhängen
  const addRowUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${EXCEL_FOLDER}/${EXCEL_FILENAME}:/workbook/tables/${tableId}/rows/add`;
  await fetch(addRowUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[
        formData.mitgliedstyp || '',
        formData.name || '',
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
    }),
  });
}

module.exports = { appendToExcel };
