import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import OfflineBanner from "./components/OfflineBanner";
import "./index.css";

// PWA: registra el service worker generado por vite-plugin-pwa (solo existe en el build de producción).
// Con registerType "autoUpdate" el SW nuevo se activa solo y la página se recarga al tomar control.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady: () => console.info("MultiCatálogo listo para usarse sin conexión"),
    onRegisterError: (error) => console.error("Error registrando el service worker:", error),
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <OfflineBanner />
  </StrictMode>
);
