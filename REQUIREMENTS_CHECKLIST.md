# REQUIREMENTS CHECKLIST — MultiCatálogo

> Fuente de verdad del progreso. Leer al inicio de cada sesión; marcar `- [x]`
> y actualizar "Estado General" al completar cualquier tarea.
>
> **Estructura:** el documento se divide en fases por **Unidad/Tema del sílabo**
> (`Silabo_Framework_Programacion_Web.md`). Cada fase trae un comentario con lo
> que se hará en esa clase. El producto integrador es UNO: MultiCatálogo —
> una tienda cosmética con red de ventas multinivel (MLM) que crece como
> **sistema políglota**: React (front) + Go/Fiber (núcleo transaccional, U2)
> + FastAPI (capa SaaS/multitenant, U3), desplegado contenerizado (U4).
>
> **Principios rectores (aplican a toda fase):**
> - Seguridad por defecto: ningún endpoint nuevo nace sin auth ni validación.
> - Inyección de dependencias: interfaces en los bordes; globals solo en el entry point.
> - Funciones puras para el dominio (comisiones, totales, validadores) — testeables sin I/O.
> - Mobile-first: UI a 360px, touch ≥44px, un campo por fila en formularios.

## Estado General

| Ítem | Valor |
|---|---|
| **Hito actual** | **Back-office completo + PWA offline básica** (FASE 0-7 backend completadas + PWA FASE 1-4) |
| **Última tarea completada** | PWA FASE 3-4: caché API/imágenes + offline (banner, fallback SPA) + iconos provisionales (2026-10-22) |
| **Siguiente tarea pendiente** | PWA FASE 5: `npm install` + `npm run build:pwa` + `npm run preview` y verificar SW (ver FASE 5-7) |
| **Bloqueadores** | Ninguno. Docker con PostgreSQL (5434) + Redis (6379) corriendo |

## Arquitectura objetivo del semestre

```
React SPA (:5173) ──► Caddy/Nginx (U4: proxy inverso + SSL)
                        ├─ /api/tx/*   → Go/Fiber  :3000  — núcleo transaccional (U2)
                        └─ /api/saas/* → FastAPI   :8000  — capa SaaS/multitenant (U3)
                                            │
                          PostgreSQL 16 (:5434) + Redis (:6379)
```

---

# UNIDAD 1 — FRAMEWORKS FRONTEND (SPA React + Vite + Tailwind)

## U1-T1 · Introducción a frameworks web y arquitectura de soluciones

> Se presenta la pila tecnológica del semestre, la inversión de control y los
> lineamientos del producto integrador MultiCatálogo (tienda + red MLM).

- [x] Pila definida y workspace estructurado (`frontend/`, `backend/`)

## U1-T2 · Entorno SPA con Vite + Tailwind CSS

> Scaffold del frontend: empaquetador Vite, Tailwind v3.4, estructura de carpetas
> por responsabilidad (`components/`, `context/`, `services/`, `data/`).

- [x] Entorno SPA con Vite + Tailwind CSS
- [x] `package.json` configurado
- [x] Configuración de API URL en `frontend/src/config.ts` (`VITE_API_URL`)

## U1-T3 · Componentes y gestión de estado global

> Estado global con React Context: sesión de usuario y carrito por usuario.

- [x] `AuthContext` (sesión `{email, rol}`) y `CartContext` (carrito en localStorage por email)
- [x] Persistencia de sesión en `AuthContext` (`multicatalogo_sesion`: usuario + JWT en localStorage)
- [x] Warnings eslint resueltos (`npm run lint` → 0 errores, 0 warnings)

## U1-T4 · Consumo de API RESTful y enrutamiento

> Promesas con fetch, capa de servicios desacoplada y guardas de ruta por rol.

- [x] `services/productosService.ts`, `redService.ts` + guardas `ProtectedRoute`/`AdminRoute`
- [x] `services/http.ts`: `apiFetch` único con `Authorization: Bearer` automático, `ApiError` tipado con status y helpers de sesión

## U1-T5 · Interfaces full-screen y flujos MLM (Práctica 03)

> Vistas inmersivas del catálogo y flujo completo de compra y red multinivel.

- [x] F8 Login con rol + redirección por rol
- [x] F1 Storefront `/tienda` full-screen | F3 Catálogo con búsqueda/filtros | F2 Detalle `/producto/:id` | F4 Lightbox
- [x] F5 Carrito + checkout + confirmación | F6 Árbol multinivel comisiones 10/5/2 % | F7 Dashboard KPIs
- [x] `Checkout.tsx` → `POST /api/checkout` real (sin simulación) + manejo de `APIError`
- [ ] Audit mobile-first (pendiente: comprobar en navegador a 375px): 375px sin overflow en Dashboard/MiRed/Catálogo; botones de acción ≥44px (`Añadir al Carrito`, steppers de `Carrito`, `Cerrar Sesión`)

---

# UNIDAD 2 — BACKEND ALTA TRANSACCIONALIDAD (Go/Fiber · "entornos bancarios")

## U2-T1 · Rendimiento, memoria y concurrencia

> Goroutines y contextos: procesos de misión crítica que no bloquean la respuesta HTTP.

- [x] Goroutine `procesarComisiones` tras el COMMIT del pedido (contexto propio, no el del request)

## U2-T2 · Microservicios y APIs robustas (Fiber)

> API REST en capas con contrato de error estándar y configuración por entorno.

- [x] Capas routes → controllers → repository; endpoints login/productos/red/health
- [x] `APIError{status,message,details}` en todos los errores + validación de entrada (400/404)
- [x] Puerto de escucha configurable (`PORT`, defecto 3000)
- [x] `/api/health` real: `HealthController` con ping a Postgres (503 si cae) y Redis (`"degraded"` si cae)

## U2-T3 · Persistencia PostgreSQL + caché Redis

> Dockeriza la BD, SQL puro con pgx, reconstrucción del árbol y Cache-Aside.

- [x] `docker-compose` Postgres 16 + Redis alpine + volumen + healthchecks
- [x] `init.sql` (usuarios/productos/referidos + seed), `repository.go` a SQL real, árbol por `parent_id`
- [x] Cache-Aside: `productos:all` TTL 5 min, `red:tree:{email}` TTL 10 min, degradación sin caché
- [x] Índices: `referidos(parent_id)`, `pedidos(cliente_email)`, `pedido_items(pedido_id)`, `productos(categoria)` (en `init.sql` y en la migración `003_seguridad.sql`)
- [x] Errores propagados: firmas del repo devuelven `error`; `ErrNoEncontrado`→404/401, resto→500 (nunca lista vacía silenciosa)

## U2-T4 · Inyección de dependencias y microservicio seguro

> DI por interfaces en toda la cadena + transacción ACID del checkout + hardening.

- [x] Interfaces `DBRepository`/`CacheRepository`; `PostgresRepository`/`RedisCache`; structs de controladores; `NewControllers` en `main.go`
- [x] `POST /api/checkout` ACID: `FOR UPDATE` + descuento de stock + `pedidos`/`pedido_items`, ROLLBACK → 400/500, total recalculado en servidor
- [x] Invalidación de caché tras compra: `productos:all` al confirmar el COMMIT y `red:tree:*` al terminar las comisiones (`services/checkout.go`) + migración `002_checkout.sql`
- [x] bcrypt de passwords (pgcrypto `crypt()/gen_salt('bf')` en migración `003_seguridad.sql` + seed; login con `CompareHashAndPassword`)
- [x] JWT real (`JWT_SECRET` en env, claims `{sub,email,rol,iat,exp}` 2h, HS256) + `middleware.RequireAuth(secret)`/`RequireAdmin()`
- [x] Protegidos `/api/checkout` (RequireAuth) y `/api/red` (RequireAuth + RequireAdmin): 401 sin token / token adulterado, 403 si no es admin; `?email=` ya no se usa
- [x] Checkout toma la identidad del TOKEN (`c.Locals` desde claims) — verificado: el `email` del body se ignora: `cliente_email` y comisiones salen del usuario del token (el formulario lo muestra de solo lectura)
- [x] Errores sanitizados: `Details` solo con `APP_ENV=dev`; `ErrCantidadInvalida` propio (400 "cantidad debe ser mayor que cero", distinto de stock)

---

# BACK-OFFICE MULTI-CATÁLOGO (FASE 0-7)

## FASE 0 — Migración de datos previa ✅

- [x] `ALTER usuarios`: `+ nombre`, `+ activo`, `+ referido_id`, `+ creado_en`
- [x] `ALTER referidos`: `+ codigo VARCHAR UNIQUE`
- [x] `ALTER productos`: `+ activo BOOLEAN DEFAULT true`
- [x] `ALTER pedidos`: `+ estado VARCHAR DEFAULT 'pendiente'`, `+ usuario_id INTEGER`
- [x] Tabla `comisiones` + índices
- [x] Tabla `liquidaciones`
- [x] Enlazar seed: `usuarios.referido_id` → admin→0, cliente→2

**Archivos:** `database/004_backoffice.sql` aplicado ✅

## FASE 1 — Registro de usuarios + vínculo referido real ✅

- [x] `POST /api/register` con transacción (usuario + referido)
- [x] bcrypt en registro
- [x] Validación código de referido
- [x] `409` email duplicado, `400` código inválido

**Archivos:** `models/RegisterRequest`, `repository.CrearUsuario`, `controllers/registerController.go` ✅

## FASE 2 — CRUD de productos (admin) ✅

- [x] `POST /api/admin/productos` (crear)
- [x] `PUT /api/admin/productos/:id` (actualizar parcial)
- [x] `DELETE /api/admin/productos/:id` (borrado lógico)
- [x] `GET /api/admin/productos` (incluye inactivos)
- [x] Invalidación de caché tras escritura

**Archivos:** `models/CrearProductoRequest`, `models/ActualizarProductoRequest`, `repository.CRUDEnProductos`, `controllers/prodController.go` extendido ✅

## FASE 3 — Consulta y gestión de pedidos ✅

- [x] `GET /api/pedidos/mios` (pedidos del usuario, paginado)
- [x] `GET /api/admin/pedidos` (todos, paginado + filtro `?estado=`)
- [x] `GET /api/pedidos/:id` (detalle con items)
- [x] `PATCH /api/admin/pedidos/:id/estado` (cambiar estado)
- [x] Cancelación devuelve stock + revierte comisiones (transacción)

**Archivos:** `models/PedidoDetalle`, `models/ActualizarEstadoRequest`, `repository.GetPedidosMios`, `repository.ActualizarEstadoPedido`, `controllers/pedidosController.go` ✅

## FASE 4 — Ledger de comisiones + red propia ✅

- [x] `CrearPedido` inserta en `comisiones` dentro de la transacción
- [x] `GET /api/red/mia` (subárbol del usuario del token)
- [x] `GET /api/comisiones/mias` (ledger + resumen pendiente/pagado)

**Archivos:** `models/Comision`, `models/ComisionesResumen`, `repository.GetRedMia`, `repository.GetComisionesMias`, `controllers/comisionesController.go` ✅

## FASE 5 — Liquidaciones a distribuidores ✅

- [x] `POST /api/admin/liquidaciones` (admin, transacción)
- [x] `GET /api/admin/liquidaciones` (admin)
- [x] `GET /api/liquidaciones/mias` (distribuidor)

## FASE 6 — Reportes y dashboard real ✅

- [x] `GET /api/reportes/resumen`
- [x] `GET /api/reportes/top-productos`
- [x] `GET /api/reportes/top-referidos`
- [x] `GET /api/reportes/comisiones-pendientes`

## FASE 7 — Operaciones de API (dureza final) ✅

- [x] Paginación estándar `{data,page,limit,total}` en productos admin y pedidos (+ `GET /api/admin/usuarios` paginado; el historial de liquidaciones se pagina en el front)
- [x] Búsqueda server-side ILIKE `?q=` en `/api/admin/productos` (el catálogo público sigue cacheado; `GET /api/productos?q=` también busca en el servidor)
- [x] Auditoría de rutas: toda escritura exige RequireAuth (solo `/api/login` y `/api/register` son públicas a propósito)

---

# FRONTEND PWA (Progressive Web App)

> Plan de implementación por fases para transformar MultiCatálogo en PWA instalable y offline-first.

## FASE 0 — Preparación de Assets Visuales

> Antes de configurar PWA: preparar iconos y assets que la app necesita para instalarse.

- [ ] Crear logotipo cuadrado definitivo para MultiCatálogo (mínimo 512x512px) — **hoy hay iconos PROVISIONALES** ("M" blanca sobre rosa #ec4899)
- [x] Generar iconos PWA en múltiples tamaños (192x192, 512x512, maskable 512, apple-touch-icon 180) — provisionales
- [x] Colocar iconos en `frontend/public/` con nombres correctos
- [x] Crear favicon.ico (16/32/48px) — provisional
- [ ] Generar splash screen (opcional, para iOS)

**Instrucciones:** Ver `frontend/public/README_ICONOS.md`

---

## FASE 1 — Configuración Básica PWA

> Instalar dependencias y configurar vite-plugin-pwa con manifest básico.

- [x] `npm install -D vite-plugin-pwa workbox-window`
- [x] Configurar `vite.config.ts` con `VitePWA` plugin
- [x] Definir manifest en `vite.config.ts` (nombre, colores, display: standalone)
- [x] Configurar `registerType: 'autoUpdate'` para actualizaciones automáticas
- [x] Agregar script `build:pwa` en `package.json`

**Archivos:** `vite.config.ts`, `package.json`

---

## FASE 2 — Meta Tags y HTML

> Agregar meta tags para iOS/Android compatibility en index.html.

- [x] `<meta name="theme-color" content="#ec4899">`
- [x] `<meta name="apple-mobile-web-app-capable" content="yes">`
- [x] `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- [x] `<meta name="apple-mobile-web-app-title" content="MultiCatálogo">`
- [x] Links a iconos: `<link rel="icon">`, `<link rel="apple-touch-icon">`
- [x] `<meta name="description">` para SEO

**Archivos:** `index.html`

---

## FASE 3 — Service Worker y Caching

> Configurar Workbox para caché inteligente de recursos.

- [x] Configurar `globPatterns` en workbox (js, css, html, ico, png, svg, webp)
- [x] Caché de fuentes Google Fonts (CacheFirst, 1 año)
- [x] Caché de fuentes Gstatic (CacheFirst, 1 año)
- [x] Caché de API (NetworkFirst, timeout 4 s, 1 día) **solo** de `GET /api/productos[/:id]` (público). Nada autenticado se cachea
- [x] Estrategia de caché para imágenes (CacheFirst, 30 días, `request.destination === 'image'`, acepta respuestas opaque)
- [x] JS/CSS: cubiertos por el **precache** de Workbox (hash en el nombre). Se retiró la regla runtime StaleWhileRevalidate de Devin porque era redundante y podía mezclar chunks de versiones distintas

**Archivos:** `vite.config.ts` (sección workbox)

---

## FASE 4 — Offline Handling

> Definir comportamiento cuando no hay conexión a internet.

- [x] `public/offline.html` creado y precacheado (página estática de respaldo)
- [x] Navegación offline: `navigateFallback: /index.html` (+ denylist `/api/`) sirve el shell de la SPA sin conexión; registro del SW con `virtual:pwa-register` en `main.tsx`
- [x] Banner "Sin conexión" (`components/OfflineBanner.tsx` + `hooks/useOnlineStatus.ts`)
- [x] Botón "Instalar app" propio (`components/InstallButton.tsx` + `hooks/useInstallPrompt.ts`, evento `beforeinstallprompt`): flotante abajo-izquierda en Login y en el footer del Sidebar. Solo Chrome/Edge/Android; en iOS se instala desde Compartir → Agregar a inicio
- [ ] ~~Cola de peticiones fallidas~~ **DESCARTADO a propósito**: reencolar `POST /api/checkout` podría ejecutar compras horas después (stock/precio cambiados, JWT de 2 h vencido). Sin red, el checkout falla con `ApiError(0)` y el usuario reintenta

**Archivos:** `src/main.tsx`, `src/components/OfflineBanner.tsx`, `src/hooks/useOnlineStatus.ts`, `public/offline.html`

---

## FASE 5 — Build y Optimización

> Compilar para producción con optimizaciones PWA.

- [ ] Ejecutar `npm run build:pwa` - **PENDIENTE**
- [ ] Verificar que `dist/` contiene `manifest.json` y `sw.js` - **PENDIENTE**
- [ ] Verificar que service worker se registra correctamente - **PENDIENTE**
- [ ] Optimizar imágenes (compresión PNG/WebP) - **PENDIENTE**
- [ ] Minificar CSS/JS (ya viene con Vite) - **PENDIENTE**

**Comandos:** `npm run build:pwa`

---

## FASE 6 — Despliegue con HTTPS

> PWA requiere HTTPS obligatoriamente (excepto localhost).

- [ ] Elegir hosting con HTTPS gratuito (Netlify, Vercel, GitHub Pages) - **PENDIENTE**
- [ ] Configurar build output (`dist/`) - **PENDIENTE**
- [ ] Configurar redirecciones HTTP→HTTPS - **PENDIENTE**
- [ ] Subir service worker con correct MIME types - **PENDIENTE**
- [ ] Probar despliegue en móvil real - **PENDIENTE**

**Hosting recomendado:** Netlify (gratis, HTTPS automático, build automation)

---

## FASE 7 — Verificación y Testing

> Validar que la PWA cumple con los estándares Lighthouse.

- [ ] Ejecutar Lighthouse audit en Chrome DevTools → PWA - **PENDIENTE**
- [ ] Debe obtener 90+ puntos en PWA audit - **PENDIENTE**
- [ ] Verificar que aparece "Instalar como app" en móvil - **PENDIENTE**
- [ ] Probar modo offline (desconectar internet) - **PENDIENTE**
- [ ] Probar auto-update (lanzar nueva versión) - **PENDIENTE**
- [ ] Probar en iOS Safari y Android Chrome - **PENDIENTE**

**Herramientas:** Chrome DevTools → Lighthouse, Android Emulator

---

## Estado de fases PWA

| Fase | Entregable | Estado |
|---|---|---|
| 0 | Iconos y assets visuales | 🟡 Iconos provisionales listos; falta logo definitivo y splash |
| 1 | Configuración básica vite-plugin-pwa | ✅ 2026-10-21 |
| 2 | Meta tags iOS/Android | ✅ 2026-10-21 |
| 3 | Service Worker y caching | ✅ 2026-10-22 |
| 4 | Offline handling | ✅ 2026-10-22 (sin cola de reintentos, a propósito) |
| 5 | Build y optimización | ⏳ Pendiente |
| 6 | Despliegue HTTPS | ⏳ Pendiente |
| 7 | Verificación Lighthouse | ⏳ Pendiente |

> **Nota:** FASE 0 (parcial), 1-4 completadas en código; `tsc` y `eslint` pasan. El `vite build` NO se pudo ejecutar al generar estos cambios (sin red ni binario de esbuild para Linux): FASE 5-7 requieren ejecución manual (build, despliegue HTTPS, Lighthouse).

---

# ESTRUCTURA ACTUAL DEL PROYECTO

```
MultiCatalogo/
├── backend/          API en Go (Fiber) — puerto 3000
│   ├── config/       Conexión DB y Redis
│   ├── controllers/  Lógica de negocio
│   ├── database/     init.sql, migraciones
│   ├── models/       Structs Go
│   ├── repository/   Acceso a datos
│   ├── routes/       Definición de endpoints
│   ├── services/     Lógica de dominio (JWT, Checkout)
│   ├── main.go       Entry point
│   └── .env.example  Variables de entorno (DB, Redis, JWT_SECRET)
└── frontend/         React 19 + Vite + Tailwind + React Router 7 + TypeScript
    └── src/
        ├── components/
        ├── context/
        ├── services/
        └── data/
```
