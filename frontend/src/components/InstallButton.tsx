// src/components/InstallButton.tsx
// Botón "Instalar app". Solo se muestra cuando el navegador permite instalar la PWA
// (y desaparece si ya está instalada).
import { useInstallPrompt } from "../hooks/useInstallPrompt";

interface Props {
  className?: string;
  collapsed?: boolean; // en el Sidebar colapsado solo se muestra el icono
}

const InstallButton = ({ className = "", collapsed = false }: Props) => {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={install}
      title="Instalar app"
      aria-label="Instalar app"
      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-pink-500 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300 ${className}`}
    >
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      <span className={collapsed ? "md:hidden" : ""}>Instalar app</span>
    </button>
  );
};

export default InstallButton;
