import React from 'react';
import './App.css';
import Layout from './components/Layout';
// import Digitalizador from './components/Digitalizador';
import DigitalizadorPro from './components/DigitalizadorPro';

function App() {
  return (
    <Layout>
      <div className='App'>
        <header className='App-header'>
          {/* <Digitalizador/> */}
          <DigitalizadorPro/>
        </header>
      </div>
    </Layout>
  );
}

export default App;
