import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LaunchIntro } from './components/StartupScreen'
import { NetworkStatus } from './features/pwa/NetworkStatus'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkStatus />
    <App />
    <LaunchIntro />
  </StrictMode>,
)
