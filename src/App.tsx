import React from 'react';
import './App.css';
import Layout from './components/Layout';
// import Digitalizador from './components/Digitalizador';
// import DigitalizadorPro from './components/DigitalizadorPro';
import DigitalizadorNew from './components/DigitalizadorNew';

function App() {
  return (
    <Layout>
      <div className='App'>
        <header className='App-header'>
          {/* <Digitalizador/> */}
          {/* <DigitalizadorPro/> */}
          <DigitalizadorNew/>
        </header>
      </div>
    </Layout>
  );
}

export default App;
