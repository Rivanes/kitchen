import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NetworkStatus } from './features/pwa/NetworkStatus'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkStatus />
    <App />
  </StrictMode>,
)
