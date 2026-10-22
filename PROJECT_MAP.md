# PROJECT_MAP — MultiCatálogo (back-office MLM)

## Backend (Go + Fiber, puerto 3000)
| Capa | Archivos clave |
|---|---|
| Rutas | `routes/routes.go` |
| Controladores | `register`, `auth`, `prod`, `checkout`, `pedidos`, `comisiones`, `liquidaciones`, `reportes`, `usuarios` (`controllers/*Controller.go`) |
| Repositorio (PostgreSQL + Redis) | `repository/interfaces.go`, `repository/postgres.go`, `repository/cache.go` |
| Reglas puras | `domain/comisiones.go` (`RepartirComisiones`, con tests) |
| BD | `database/init.sql`, `003_seguridad.sql`, `004_backoffice.sql` (+ `docker-compose.yml` las monta en orden) |

## Endpoints (rol)
- Públicos: `POST /api/login`, `POST /api/register`, `GET /api/productos` (`?q=` busca), `GET /api/productos/:id`
- Cliente (JWT): `POST /api/checkout`, `GET /api/pedidos/mios`, `GET /api/pedidos/:id` (solo dueño/admin), `GET /api/red/mia`, `GET /api/comisiones/mias`, `GET /api/liquidaciones/mias`
- Admin (JWT + rol admin): productos `POST|PUT|DELETE /api/productos[/:id]` y `GET /api/admin/productos?q&page&limit`; pedidos `GET /api/pedidos`, `PATCH /api/pedidos/:id/estado`; liquidaciones `POST|GET /api/liquidaciones`; `GET /api/admin/usuarios`; reportes `GET /api/reportes/{resumen,top-productos,top-referidos,comisiones-pendientes}`
- (Los alias `/api/admin/pedidos`, `/api/admin/liquidaciones` y `/api/admin/productos` apuntan a los mismos handlers; el frontend usa esos.)

## Frontend (React 19 + Vite + Tailwind + Router 7)
- Públicas: `/login`, `/registro?ref=CODIGO`
- Cliente: `/tienda`, `/catalogo`, `/carrito`, `/checkout`, `/mis-pedidos`, `/mi-red` (link de invitación, comisiones, cobros)
- Admin: `/` (Dashboard con reportes reales), `/admin/productos`, `/admin/pedidos`, `/admin/liquidaciones`
- Servicios en `src/services/`, componentes en `src/components/`.
