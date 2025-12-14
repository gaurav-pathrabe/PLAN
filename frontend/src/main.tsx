import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'
import { initializeTheme } from './store/theme'

// Initialize theme immediately before React mounts to prevent flash
initializeTheme()

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
