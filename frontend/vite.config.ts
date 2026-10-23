import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const DIA = 60 * 60 * 24;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // El registro del SW se hace a mano en main.tsx con `virtual:pwa-register`
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "offline.html"],
      manifest: {
        name: "Justin Tomalá",
        short_name: "JT",
        description: "Tienda cosmética con red de ventas multinivel",
        theme_color: "#ec4899",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          // "maskable" va en su propio icono (con margen de seguridad), no combinado con "any"
          { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell + assets locales: se precachean en el build (incluye js/css con hash,
        // por eso NO hace falta una regla runtime StaleWhileRevalidate para ellos).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}"],
        cleanupOutdatedCaches: true,
        // SPA: cualquier navegación (/tienda, /carrito...) sirve el shell cacheado, también offline.
        // Las rutas de la API nunca se tratan como navegación.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Fuentes de Google (1 año)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: DIA * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: DIA * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Imágenes remotas de productos (picsum.photos): CacheFirst 30 días.
          // statuses [0, 200] porque las respuestas cross-origin sin CORS son "opaque" (status 0).
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 80, maxAgeSeconds: DIA * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API: SOLO el catálogo público (GET /api/productos y /api/productos/:id).
          // NetworkFirst: con red siempre muestra datos frescos; sin red (o si tarda > 4 s) usa la última copia.
          // Nada autenticado (pedidos, red, comisiones, admin, checkout) se cachea: son datos privados
          // por usuario y el checkout debe fallar de forma explícita si no hay conexión.
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && /^\/api\/productos(\/|$)/.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-productos-cache",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: DIA },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: { host: true },
});
