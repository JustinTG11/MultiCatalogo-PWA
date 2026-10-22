// src/components/OfflineBanner.tsx
// Aviso global "Modo sin conexión". Va fijo abajo (respeta la zona segura de iOS) y no bloquea los toques.
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto rounded-lg bg-slate-900/95 px-4 py-2 text-sm font-medium text-white shadow-lg">
        Sin conexión · verás el catálogo guardado; comprar y la red requieren internet
      </div>
    </div>
  );
};

export default OfflineBanner;
