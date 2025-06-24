const fs = require('fs');
const path = require('path');
const open = require('open');
const readline = require('readline');
const fetch = require('node-fetch');

const configDir = process.env.CONFIG_DIR || path.join(__dirname, 'config');
const secretsPath = path.join(configDir, 'secrets.json');
const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

const redirectUri = 'http://localhost:53682';
const authUrl = `https://login.microsoftonline.com/${secrets.onedrive_tenant_id}/oauth2/v2.0/authorize?client_id=${secrets.onedrive_client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=offline_access%20Files.ReadWrite.All%20User.Read`;

console.log('Öffne Browser für Microsoft Login...');
open(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Bitte kopiere den Code-Parameter aus der URL nach Login und füge ihn hier ein:\nCode: ', async (code) => {
  rl.close();
  const tokenUrl = `https://login.microsoftonline.com/${secrets.onedrive_tenant_id}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', secrets.onedrive_client_id);
  params.append('scope', 'offline_access Files.ReadWrite.All User.Read');
  params.append('code', code.trim());
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  params.append('client_secret', secrets.onedrive_client_secret);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const data = await res.json();
  if (data.refresh_token) {
    secrets.onedrive_refresh_token = data.refresh_token;
    fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2));
    console.log('Refresh Token erfolgreich gespeichert in secrets.json!');
  } else {
    console.error('Fehler beim Abrufen des Refresh Tokens:', data);
  }
});
