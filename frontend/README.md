# MultiCatálogo — Frontend

Práctica 03 (Unidad 1, Tema 5) — Framework Programación Web.
Stack: **React 19 + Vite + Tailwind CSS + React Router v7 + TypeScript**.

## Estructura

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── src/
    ├── main.tsx
    ├── App.tsx                 # rutas + guardas (ProtectedRoute, AdminRoute, CartBoundary)
    ├── config.ts               # API_URL (backend en el puerto 3000)
    ├── index.css
    ├── context/
    │   ├── AuthContext.tsx     # usuario + rol (admin | cliente)
    │   └── CartContext.tsx     # carrito persistente por usuario (localStorage)
    ├── data/
    │   ├── productos.ts        # mock del catálogo
    │   └── red.ts              # red multinivel + funciones de comisiones
    ├── services/
    │   └── productosService.ts
    └── components/
        ├── Layout.tsx  Navbar.tsx  Sidebar.tsx
        ├── Login.tsx
        ├── Storefront.tsx      # /tienda
        ├── Catalogo.tsx        # /catalogo
        ├── DetalleProducto.tsx # /producto/:id
        ├── Carrito.tsx  Checkout.tsx  Confirmacion.tsx
        ├── MiRed.tsx           # /mi-red (solo admin)
        └── Dashboard.tsx       # /       (solo admin)
```

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # 0 errores (2 warnings de fast-refresh en los context son aceptables)
npm run build    # tsc -b + vite build
```

Requiere el backend corriendo en el puerto 3000 (ver `../backend`).

## Cuentas de prueba

| Rol     | Correo               | Contraseña |
|---------|----------------------|------------|
| Admin   | admin@upse.edu.ec    | 123456     |
| Cliente | cliente@upse.edu.ec  | 123456     |

## Rutas

| Ruta | Acceso |
|---|---|
| `/login` | público |
| `/` (Dashboard), `/mi-red` | solo admin |
| `/tienda`, `/catalogo`, `/producto/:id`, `/carrito`, `/checkout`, `/confirmacion` | admin y cliente |
