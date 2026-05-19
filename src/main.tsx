import React from "react"
import ReactDOM from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import App from "./App"
import { ToastProvider } from "./components/Toast"
import { useThemeStore } from "./stores/themeStore"
import "./index.css"
import "./utils/i18n"

useThemeStore.getState().initTheme()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HelmetProvider>
  </React.StrictMode>
)
