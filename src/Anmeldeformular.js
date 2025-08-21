import React, { useState } from 'react';
import './Anmeldeformular.css';

// Hilfsfunktionen für IBAN/BIC-Validierung
function validateIBAN(iban) {
  if (!iban) return false;
  const ibanNorm = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^([A-Z]{2}\d{2}[A-Z0-9]{1,30})$/.test(ibanNorm)) return false;
  const rearranged = ibanNorm.slice(4) + ibanNorm.slice(0, 4);
  const replaced = rearranged.replace(/[A-Z]/g, ch => (ch.charCodeAt(0) - 55).toString());
  let remainder = replaced;
  while (remainder.length > 9) {
    remainder = (parseInt(remainder.slice(0, 9), 10) % 97).toString() + remainder.slice(9);
  }
  return parseInt(remainder, 10) % 97 === 1;
}
function validateBIC(bic) {
  if (!bic) return false;
  return /^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(bic.trim());
}

const initialState = {
  mitgliedstyp: '',
  name: '',
  ansprechpartner: '', // NEU
  strasse: '',
  plzort: '',
  telefon: '',
  email: '',
  geburtsdatum: '',
  beitrag: '',
  beitragFrei: '',
  kontoinhaber: '',
  iban: '',
  bic: '',
  kreditinstitut: '',
  ort: '',
  datum: new Date().toISOString().slice(0, 10), // aktuelles Datum als Default
  datenschutz: false,
  // ...existing code...
};


function Modal({ show, children }) {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}

function Anmeldeformular() {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [ibanError, setIbanError] = useState('');
  const [bicError, setBicError] = useState('');
  const [freiwilligAktiv, setFreiwilligAktiv] = useState(false);
  // ...existing code...

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'freiwilligAktiv') {
      setFreiwilligAktiv(checked);
      if (!checked) {
        setForm((prev) => ({ ...prev, beitragFrei: '' }));
      }
      return;
    }
    setForm((prev) => {
      let newState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      // Automatische Auswahl des Beitrags je nach Mitgliedstyp
      if (name === 'mitgliedstyp') {
        if (value === 'Schüler/in') newState.beitrag = '10';
        else if (value === 'Lehrkraft') newState.beitrag = '25';
        else if (value === 'Unternehmen') newState.beitrag = '100';
        else newState.beitrag = '';
        // Wenn Typ geändert, freiwilligen Beitrag zurücksetzen
        newState.beitragFrei = '';
        setFreiwilligAktiv(false);
      }
      // Validierung: Freiwilliger Beitrag muss größer als Standardbeitrag sein
      if (name === 'beitragFrei' && freiwilligAktiv) {
        if (parseFloat(value) <= parseFloat(prev.beitrag)) {
          setError('Der freiwillige Beitrag muss größer als der reguläre Beitrag sein.');
        } else {
          setError(null);
        }
      }
      return newState;
    });
  };

  // Validierung auch bei TAB (onBlur) auf beitragFrei
  const handleBeitragFreiBlur = (e) => {
    const value = e.target.value;
    if (freiwilligAktiv) {
      if (parseFloat(value) <= parseFloat(form.beitrag)) {
        setError('Der freiwillige Beitrag muss größer als der reguläre Beitrag sein.');
      } else {
        setError(null);
      }
    }
  };


  const getApiUrl = () => {
    // Wenn Frontend auf localhost läuft, nutze explizit das aktuelle Protokoll und Port 4000
    if (window.location.hostname === 'localhost') {
      return window.location.protocol + '//localhost:4000/api/anmeldung';
    }
    // Sonst immer window.location.origin (inkl. Protokoll und Port, falls gesetzt)
    return window.location.origin + '/api/anmeldung';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // IBAN/BIC-Validierung vor dem Absenden
    let ibanValid = validateIBAN(form.iban);
    let bicValid = validateBIC(form.bic);
    let hasError = false;
    if (!ibanValid) {
      setIbanError('Ungültige IBAN');
      hasError = true;
    }
    if (!bicValid) {
      hasError = true;
    }
    if (hasError) {
      setError('Bitte korrigieren Sie IBAN und/oder BIC.');
      return;
    }
    setLoading(true);
    setSubmitted(false);
    setError(null);
    setMissingFields([]);
  // ...existing code...
    // Pflichtfeldprüfung
    const required = [
      { key: 'mitgliedstyp', label: 'Mitgliedstyp' },
      { key: 'name', label: 'Name' },
      { key: 'strasse', label: 'Straße' },
      { key: 'plzort', label: 'PLZ, Ort' },
      { key: 'email', label: 'E-Mail' },
      { key: 'iban', label: 'IBAN' },
      { key: 'bic', label: 'BIC' },
      { key: 'kreditinstitut', label: 'Kreditinstitut' },
      { key: 'ort', label: 'Ort' },
      { key: 'datenschutz', label: 'Datenschutz' }
    ];
    let missing = required.filter(f => !form[f.key] || (typeof form[f.key] === 'boolean' && !form[f.key])).map(f => f.label);
  // ...existing code...
    if (missing.length > 0) {
      setLoading(false);
      setMissingFields(missing);
      setError('Bitte füllen Sie alle Pflichtfelder aus!');
      return;
    }
    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ formData: form })
      });
      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setError('Fehler beim E-Mail-Versand: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (err) {
      setError('Fehler beim Senden der Anfrage: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // IBAN-API-Abfrage
  async function fetchBankDataForIban(iban) {
    try {
      const response = await fetch(`https://openiban.com/validate/${encodeURIComponent(iban)}?getBIC=true&validateBankCode=true`);
      const data = await response.json();
      if (data.valid && data.bankData) {
        setForm(prev => ({
          ...prev,
          bic: data.bankData.bic || prev.bic,
          kreditinstitut: data.bankData.name || prev.kreditinstitut
        }));
      }
    } catch (err) {
      // Fehler ignorieren, falls Service nicht erreichbar
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'iban') {
      if (value && !validateIBAN(value)) {
        setIbanError('Ungültige IBAN');
      } else {
        setIbanError('');
        if (value && validateIBAN(value)) {
          fetchBankDataForIban(value);
        }
      }
    }
    if (name === 'bic') {
      if (value && !validateBIC(value)) {
        setBicError('Ungültige BIC');
      } else {
        setBicError('');
      }
    }
    // Übernehme vollständigen Namen als Kontoinhaber beim Verlassen des Namensfelds
    if (name === 'name' && (!form.kontoinhaber || form.kontoinhaber.trim() === '')) {
      setForm(prev => ({ ...prev, kontoinhaber: value }));
    }
  };

  if (submitted) {
    return (
      <div className="danke-container">
        <h1>
          Vielen Dank für Ihre Anmeldung zu Pro MMBbS - Förderverein der Multi
          Media Berufsbildenden Schulen Hannover e. V.
        </h1>
      </div>
    );
  }

  return (
    <>
      <form className="anmeldeformular" autoComplete="off" onSubmit={handleSubmit} style={{ display: submitted ? 'none' : 'block' }}>
        <div style={{marginBottom:'1rem', color:'#b71c1c', fontWeight:'bold'}}>
          <span>* Pflichtfeld</span>
        </div>
        <h1>Mitgliedsanmeldung Förderverein „Pro MMBbS“ e. V.</h1>
        {/* Persönliche Angaben */}
        <fieldset>
          <legend>Persönliche Angaben</legend>
          <div className="radio-group">
            <label>Mitgliedstyp:</label>
            <label><input type="radio" name="mitgliedstyp" value="Schüler/in" checked={form.mitgliedstyp === 'Schüler/in'} onChange={handleChange} /> Schülerin/Schüler</label>
            <label><input type="radio" name="mitgliedstyp" value="Lehrkraft" checked={form.mitgliedstyp === 'Lehrkraft'} onChange={handleChange} /> Lehrkraft der MMBbS</label>
            <label><input type="radio" name="mitgliedstyp" value="Unternehmen" checked={form.mitgliedstyp === 'Unternehmen'} onChange={handleChange} /> Unternehmen/Institution</label>
            <label><input type="radio" name="mitgliedstyp" value="Sonstiges" checked={form.mitgliedstyp === 'Sonstiges'} onChange={handleChange} /> Sonstiges Mitglied</label>
          </div>
          <div>
            <label>Vor- und Nachname / Unternehmen<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} />
            </label>
          </div>
          {form.mitgliedstyp === 'Unternehmen' && (
            <div>
              <label>Ansprechpartner<br />
                <input type="text" name="ansprechpartner" value={form.ansprechpartner} onChange={handleChange} />
              </label>
            </div>
          )}
          <div>
            <label>Straße, Hausnummer<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="strasse" value={form.strasse} onChange={handleChange} />
            </label>
          </div>
          <div>
            <label>PLZ, Ort<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="plzort" value={form.plzort} onChange={handleChange} />
            </label>
          </div>
          <div>
            <label>Telefon (optional)<br />
              <input type="text" name="telefon" value={form.telefon} onChange={handleChange} />
            </label>
          </div>
          <div>
            <label>E-Mail<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </label>
          </div>
          <div>
            <label>Geburtsdatum (nur bei Schüler:innen)<br />
              <input type="date" name="geburtsdatum" value={form.geburtsdatum} onChange={handleChange} />
            </label>
          </div>
        </fieldset>
        {/* Mitgliedsbeitrag */}
        <fieldset>
          <legend>Mitgliedsbeitrag</legend>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'0.5rem',width:'100%'}}>
            <label style={{width:'100%'}}>Regulärer Beitrag:<br />
              <input type="text" name="beitrag" value={form.beitrag + ' €'} disabled style={{background:'#f5f5f5',color:'#888',width:'100%'}} />
            </label>
            <div style={{width:'100%',marginTop:'0.5rem',display:'flex',alignItems:'center'}}>
              <input type="checkbox" name="freiwilligAktiv" checked={freiwilligAktiv} onChange={handleChange} style={{marginRight:'0.5em'}} />
              <span>Ich möchte freiwillig einen höheren Beitrag zahlen</span>
            </div>
            <label style={{width:'100%',marginTop:'0.5rem'}}>Freiwilliger Beitrag (EUR):<br />
              <input type="number" name="beitragFrei" min={parseFloat(form.beitrag)+1||1} step="1" placeholder="Betrag in EUR" value={form.beitragFrei} onChange={handleChange} onBlur={handleBeitragFreiBlur} disabled={!freiwilligAktiv} style={{background:freiwilligAktiv?'#fff':'#f5f5f5',color:freiwilligAktiv?'#000':'#888',width:'100%'}} />
              {error && freiwilligAktiv && form.beitragFrei !== '' && (
                <div className="error" style={{color:'red',marginTop:'0.3em'}}>{error}</div>
              )}
            </label>
          </div>
        </fieldset>
        {/* SEPA-Lastschriftmandat */}
        <fieldset>
          <legend>SEPA-Lastschriftmandat</legend>
          <div className="sepa-mandat-hinweis" style={{marginBottom: '1rem', fontSize: '1.05rem', background: '#f6f7fa', padding: '0.7rem 1rem', borderRadius: '6px', border: '1px solid #e0e0e0'}}>
            Ich ermächtige den Förderverein „Pro MMBbS“ e. V., Zahlungen jährlich mittels SEPA-Lastschrift von meinem Konto einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom Förderverein auf mein Konto gezogenen Lastschriften einzulösen.<br/>
            <b>Hinweis:</b> Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrags verlangen. Es gelten die mit meinem Kreditinstitut vereinbarten Bedingungen.
          </div>
          <div>
            <label>Kontoinhaber (falls abweichend)<br />
              <input type="text" name="kontoinhaber" value={form.kontoinhaber} onChange={handleChange} />
            </label>
          </div>
          <div>
            <label>IBAN<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="iban" value={form.iban} onChange={handleChange} onBlur={handleBlur} />
            </label>
            {ibanError && <div className="error" style={{color:'red',marginTop:'-1rem',marginBottom:'1rem'}}>{ibanError}</div>}
          </div>
          <div>
            <label>BIC<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="bic" value={form.bic} onChange={handleChange} onBlur={handleBlur} />
            </label>
            {bicError && <div className="error" style={{color:'red',marginTop:'-1rem',marginBottom:'1rem'}}>{bicError}</div>}
          </div>
          <div>
            <label>Kreditinstitut<span style={{color:'#b71c1c'}}>*</span><br />
              <input type="text" name="kreditinstitut" value={form.kreditinstitut} onChange={handleChange} />
            </label>
          </div>
          <div className="ort-datum-row">
            <label>Ort, Datum<br /></label>
            <div className="ort-datum-fields">
              <input type="text" name="ort" value={form.ort} onChange={handleChange} placeholder="Ort" />
              <input type="date" name="datum" value={form.datum} readOnly tabIndex={-1} style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }} />
            </div>
          </div>
          {/* Unterschriftenfeld entfernt */}
        </fieldset>
        {/* Datenschutz und Optionen */}
        <fieldset>
          <legend>Datenschutz</legend>
          <div className="datenschutz-group">
             <label>
               <input type="checkbox" name="datenschutz" checked={form.datenschutz} onChange={handleChange} />
               Ich habe die <a href="/Datenverarbeitung.html" target="_blank" rel="noopener noreferrer">Hinweise zur Datenverarbeitung</a> gelesen und akzeptiere sie.<span style={{color:'#b71c1c'}}>*</span>
             </label>
          </div>
        </fieldset>
        <button type="submit" disabled={loading}>Absenden</button>
        {error && <div className="error" style={{color: 'red', marginTop: '1rem'}}>{error}</div>}
        {missingFields.length > 0 && (
          <div className="error" style={{color: 'red', marginTop: '1rem'}}>
            Bitte füllen Sie folgende Pflichtfelder aus: {missingFields.join(', ')}
          </div>
        )}
      </form>
      <Modal show={loading}>
        <div style={{textAlign:'center', padding:'2rem'}}>
          <div className="spinner" style={{marginBottom:'1.5rem'}}></div>
          <div style={{fontWeight:'bold', color:'#1a237e'}}>Bitte warten, Ihre Anmeldung wird verarbeitet ...</div>
        </div>
      </Modal>
    </>
  );
}

export default Anmeldeformular;
