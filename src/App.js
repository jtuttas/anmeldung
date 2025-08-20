import React from 'react';
import './App.css';
import Anmeldeformular from './Anmeldeformular';

// ...existing code...

function App() {
  return (
    <div className="App">
  <img src={process.env.PUBLIC_URL + '/log.png'} alt="Logo" style={{maxWidth:'220px', margin:'2rem auto 1rem', display:'block'}} />
      <Anmeldeformular />
    </div>
  );
}

export default App;
