# Anmeldung Förderverein „Pro MMBbS“ e. V.

Dies ist eine vollständige Webanwendung zur digitalen Mitgliedsanmeldung für den Förderverein „Pro MMBbS“ e. V.

## Features
- Ausfüllbares Anmeldeformular (responsive, mobilfreundlich)
- Unterschriftenfeld (Canvas, Touch/Mouse)
- Automatische PDF-Erzeugung mit allen Daten und Unterschrift
- Versand der Anmeldung per E-Mail (PDF im Anhang)
- Speicherung jeder Anmeldung als Datensatz in einer Excel-Datei auf OneDrive Business
- Fehler- und Erfolgsmeldungen im Frontend

## Projektstruktur
```
anmeldung/
  src/                # React-Quellcode (Frontend)
  public/             # Statische Dateien für React
  build/              # Build-Output (wird vom Backend ausgeliefert)
  server.js           # Express-Backend (liefert Frontend & API)
  sendMail.js         # E-Mail- und PDF-Logik (Node.js)
  onedriveExcel.js    # OneDrive/Excel-Integration (Node.js)
  get_onedrive_refresh_token.js # Hilfsskript für OAuth2-Token
  config/             # Konfigurationsordner für secrets.json und email_text.txt
    secrets.json      # Zugangsdaten für SMTP & OneDrive (nicht ins Repo!)
    email_text.txt    # E-Mail-Textvorlage
  package.json        # Abhängigkeiten
```

## Installation & Betrieb
1. **Abhängigkeiten installieren**
   ```
   cd anmeldung
   npm install
   ```
2. **SMTP- und OneDrive-Zugangsdaten in `config/secrets.json` eintragen**
   ```json
   {
     "smtp_host": "...",
     "smtp_port": 587,
     "smtp_user": "...",
     "smtp_pass": "...",
     "from": "...",
     "onedrive_client_id": "...",
     "onedrive_client_secret": "...",
     "onedrive_tenant_id": "...",
     "onedrive_refresh_token": "...",
     "onedrive_user": "..."
   }
   ```
3. **OneDrive/Graph API einrichten**
   - Registriere eine App im Azure-Portal (Azure Active Directory → App-Registrierungen).
   - Trage die Client-ID, Tenant-ID und das Client-Secret in `secrets.json` ein.
   - Vergib die Berechtigungen `Files.ReadWrite.All`, `offline_access`, `User.Read` für Microsoft Graph und erteile Admin-Zustimmung.
   - Führe das Skript aus, um den Refresh-Token zu generieren:
     ```
     node get_onedrive_refresh_token.js
     ```
   - Folge den Anweisungen im Terminal, um den Token zu erhalten und automatisch in `secrets.json` zu speichern.

4. **Frontend bauen**
   ```
   npm run build
   ```
5. **Backend starten**
   ```
   node server.js
   ```
6. **Im Browser öffnen**
   [http://localhost:4000](http://localhost:4000)

## Hinweise zu OneDrive/Excel
- Jede Anmeldung wird als neuer Datensatz in der Datei `prommbbs_anmeldungen.xlsx` im OneDrive-Ordner `/Temp` gespeichert.
- Die Datei wird automatisch angelegt, falls sie nicht existiert.
- Die Unterschrift wird als PNG-Base64-String in einer Spalte gespeichert.
- Für die OneDrive-Integration werden die Microsoft Graph API und OAuth2 verwendet.

## Sicherheit
- `secrets.json` **niemals** ins öffentliche Repository hochladen!
- Die Zugangsdaten enthalten sensible Informationen für E-Mail- und OneDrive-Zugriff.

## Anpassungen
- Für weitere Felder oder Layoutwünsche bitte die Dateien in `src/` anpassen.
- PDF-Layout kann in `sendMail.js` (Funktion `createAnmeldungPDF`) angepasst werden.
- Excel-Integration kann in `onedriveExcel.js` angepasst werden.

## Docker & Container-Betrieb
- Die Datei `config/secrets.json` und weitere Konfigurationsdateien werden per Volume in den Container gemountet (siehe `docker-compose.yml`).
- Beispiel für docker-compose:
  ```yml
  volumes:
    - ./config:/app/config:ro
  environment:
    - CONFIG_DIR=/app/config
  ```
- Im Dockerfile wird `/app/config` als Konfigurationsordner erwartet.

---
© Förderverein „Pro MMBbS“ e. V. – Stand: Juni 2025
