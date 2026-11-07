import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import theme from './config/theme.json'
import App from './App'
import { Toaster } from './components/ui'

// Design tokens come from src/config/theme.json.
const root = document.documentElement.style
root.setProperty('--c-brand', theme.brand)
root.setProperty('--c-brand-hover', theme.brandHover)
root.setProperty('--ui-radius', theme.radius)
root.setProperty('--page-pad', theme.pagePadding)
root.setProperty('--card-pad', theme.cardPadding)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
)
