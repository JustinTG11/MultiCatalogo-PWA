# MultiCatálogo

Proyecto dividido en dos partes:

```
MultiCatalogo/
├── backend/    API en Go (Fiber) — puerto 3000
└── frontend/   React 19 + Vite + Tailwind + React Router 7 + TypeScript
```

## Backend (Fase 2: PostgreSQL · Fase 3: caché con Redis · Fase 4: checkout transaccional)
```bash
cd backend
docker compose up -d                       # levanta PostgreSQL 16 + Redis
go get github.com/jackc/pgx/v5 github.com/joho/godotenv github.com/redis/go-redis/v9
go mod tidy                                # solo la primera vez (descarga dependencias)
go run main.go
```
La conexión se configura en `backend/.env` (ver `.env.example`).
Caché: `GET /api/productos` (clave `productos:all`, 5 min) y `GET /api/red` (solo admin; clave `red:tree:{email del token}`, 10 min).
En la consola del servidor verás `cache MISS` / `cache HIT`. Para vaciar la caché: `docker exec multicatalogo-redis redis-cli FLUSHALL`.
Checkout (Fase 4): `POST /api/checkout` (requiere `Authorization: Bearer <token>`). Guarda pedido, detalle y stock en una transacción;
las comisiones (10 % / 5 % / 2 %) se calculan en una goroutine y luego se invalida la caché `red:tree:*`.
Si tu base ya existe, aplica la migración: `docker exec -i multicatalogo-db psql -U postgres -d multicatalogo < database/002_checkout.sql` y luego `.../003_seguridad.sql`.
Demostración de ROLLBACK: pon `CHECKOUT_FALLA_SIMULADA=items` (o `pausa`) en `backend/.env` y reinicia el servidor.
Para reiniciar la base desde cero: `docker compose down -v && docker compose up -d`.

## Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend se conecta al backend en `http://<host>:3000` (ver `frontend/src/config.js`).
Más detalle del frontend en `frontend/README.md`.
