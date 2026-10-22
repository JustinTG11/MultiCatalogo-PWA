// src/hooks/useInstallPrompt.ts
// Captura el evento `beforeinstallprompt` de Chrome/Edge/Android para ofrecer un botón propio de instalación.
// Se escucha a nivel de módulo (no dentro de un componente) para no perder el evento si se dispara
// antes de que el componente se monte. En iOS Safari este evento no existe: no hay botón programático.
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // evita el mini-aviso automático; lo mostramos nosotros con el botón
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  // Tras instalar (por nuestro botón o por el icono de la barra) ya no hay nada que ofrecer
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false
  );

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return;
    const evt = deferredPrompt;
    deferredPrompt = null; // el evento solo se puede usar una vez
    notify();
    await evt.prompt();
    await evt.userChoice;
  };

  return { canInstall, install };
}
