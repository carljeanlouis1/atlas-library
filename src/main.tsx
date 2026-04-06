import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AudioQueueProvider } from './contexts/AudioQueueContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudioQueueProvider>
        <App />
      </AudioQueueProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
