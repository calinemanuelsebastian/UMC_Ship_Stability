import {InputHelp} from './components/input-help'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './app/language'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider><App /><InputHelp /></LanguageProvider>
  </StrictMode>,
)
