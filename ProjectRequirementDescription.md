# Project Requirement Description

## Projekttitel

Digitale Anmeldeseite für den Förderverein „Pro MMBbS“ e. V.

## Projektziel

Erstellung einer webbasierten Formularanwendung zur Mitgliedsanmeldung beim Förderverein „Pro MMBbS“ e. V., einschließlich SEPA-Lastschriftmandat. Nach dem Absenden wird ein definierter Webhook mit den Formulardaten angesteuert.

---

## 1. Funktionale Anforderungen

### 1.1 Formularstruktur

#### Persönliche Angaben

- Mitgliedstyp (Checkbox-Auswahl):
  - [ ] Schülerin/Schüler  
  - [ ] Lehrkraft der MMBbS  
  - [ ] Firma/Institution  
  - [ ] Sonstiges Mitglied  
- Vor- und Nachname / Firmenname (Textfeld)  
- Straße, Hausnummer (Textfeld)  
- PLZ, Ort (Textfeld)  
- Telefon (optional) (Textfeld)  
- E-Mail (Textfeld)  
- Geburtsdatum (nur bei Schüler:innen) (Datumsauswahl)  

#### Mitgliedsbeitrag

- Auswahl (Radiobuttons/Checkboxen):
  - [ ] 10 EUR (Schüler)
  - [ ] 25 EUR (Lehrkraft)
  - [ ] 100 EUR (Firma/Institution)
  - [ ] Freiwilliger Beitrag (Textfeld für Betrag)

#### SEPA-Lastschriftmandat (Pflichtangabe)

- Kontoinhaber (falls abweichend) (Textfeld)  
- IBAN (Textfeld)  
- BIC (Textfeld)  
- Kreditinstitut (Textfeld)  
- Ort, Datum (Textfelder oder automatische Erkennung)  
- Unterschrift (bei Minderjährigen inkl. Erziehungsberechtigte) (Unterschriftenfeld, z. B. Touchpad oder Datei-Upload)  

> Hinweistext zur SEPA-Einzugsermächtigung muss eingeblendet werden.

### 1.2 Validierung

- Pflichtfelder müssen geprüft werden.
- IBAN/BIC müssen ein gültiges Format haben.
- Wenn „Schüler:in“ ausgewählt ist, ist Geburtsdatum erforderlich.
- Beitragspflicht: Es muss eine Auswahl oder ein Betrag eingegeben sein.

### 1.3 Datenverarbeitung

- Alle eingegebenen Daten werden gesammelt und beim Abschicken als JSON-Datenpaket an einen Webhook (URL wird separat definiert) übergeben.

---

## 2. Nicht-funktionale Anforderungen

### 2.1 Datenschutz & Sicherheit

- HTTPS-Verschlüsselung
- Einhaltung der DSGVO
- Keine Speicherung der Daten auf dem Server – nur Weitergabe über Webhook
- Hinweis zur Datenverarbeitung wird angezeigt

### 2.2 Barrierefreiheit

- Nutzung barrierefreier HTML-Elemente
- Kontrastreiches Design
- Tastaturbedienbarkeit

### 2.3 Responsives Design

- Optimierung für Mobilgeräte, Tablets und Desktops

---

## 3. Technische Anforderungen

### 3.1 Frontend

- HTML5, CSS3 
- JavaScript (Framework optional, z. B. Vue/React – je nach Präferenz)
- Formularvalidierung im Frontend

### 3.2 Backend / Datenübergabe

- Keine serverseitige Datenhaltung
- Verwendung eines konfigurierbaren Webhooks zur Übergabe der Formularinhalte
- Übergabeformat: JSON

### 3.3 Optional

- PDF-Generierung aus dem ausgefüllten Formular (lokal im Browser)
- Opt-in für Kopie an eigene E-Mail-Adresse (z. B. durch Checkbox)

---

## 4. Projektumfang & Abgrenzung

### Im Umfang enthalten

- Umsetzung des Formulars
- Gestaltung nach Originalvorlage
- Integration von Validierung
- Übergabe an Webhook

### Nicht im Umfang enthalten

- Speicherung in Datenbanken
- Mitgliederverwaltung oder Login
- Serverbetrieb oder Hosting
