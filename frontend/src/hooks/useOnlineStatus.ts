// src/hooks/useOnlineStatus.ts
// Estado de conexión del navegador (navigator.onLine + eventos online/offline).
import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // render de servidor: se asume en línea
  );
