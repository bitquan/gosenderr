import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Enable mock GPS in development for testing without real location
if (import.meta.env.DEV) {
  import('./lib/mock-gps').then(({ enableMockGPS }) => {
    console.log('💡 Mock GPS available in console: enableMockGPS() / disableMockGPS()');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
