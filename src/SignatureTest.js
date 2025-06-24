import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './Anmeldeformular.css';

function SignatureTest() {
  const sigCanvasRef = useRef(null);

  const handleClearSignature = () => {
    sigCanvasRef.current.clear();
  };

  return (
    <div style={{maxWidth: 600, margin: '2rem auto', background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
      <h2>Test Unterschrift (Standalone)</h2>
      <div style={{width: '350px', maxWidth: '100%'}}>
        <SignatureCanvas
          ref={sigCanvasRef}
          penColor="#222"
          backgroundColor="#fff"
          clearOnResize={false}
          canvasProps={{
            width: 350,
            height: 100,
            className: 'sigCanvas',
            style: {
              border: '1px solid #ccc',
              borderRadius: '4px',
              display: 'block',
              background: '#fff',
              touchAction: 'none',
            }
          }}
        />
      </div>
      <button type="button" onClick={handleClearSignature} style={{marginTop:'0.5rem'}}>Unterschrift löschen</button>
    </div>
  );
}

export default SignatureTest;
