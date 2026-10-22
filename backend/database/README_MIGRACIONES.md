# Migraciones de Base de Datos - MultiCatálogo

## Migración 003: Seguridad con bcrypt y JWT

### Qué hace esta migración

- Habilita la extensión `pgcrypto` de PostgreSQL para funciones criptográficas
- Convierte los passwords de los usuarios existentes de texto plano a hashes bcrypt (cost factor 10)
- Prepara la base de datos para usar JWT en lugar de tokens ficticios

### Cómo aplicarla

Si tienes una base de datos existente:

```bash
# Opción 1: Si usas Docker con PostgreSQL
docker exec -i multicatalogo-db psql -U postgres -d multicatalogo < database/003_seguridad.sql

# Opción 2: Si usas PostgreSQL local
psql -U postgres -d multicatalogo -f database/003_seguridad.sql
```

Si es una instalación nueva, el `init.sql` ya incluirá los cambios en la próxima versión.

### Verificación

Después de aplicar la migración, verifica que los passwords estén hasheados:

```sql
SELECT email, password FROM usuarios;
```

Deberías ver hashes que comienzan con `$2a$10$` en lugar de `123456`.

### Cambios en el código

El backend ahora:
- Usa `bcrypt.CompareHashAndPassword` para validar passwords (repository/postgres.go)
- Genera JWT reales con HS256, expiración 2h (services/jwt.go)
- Valida JWT en el middleware `RequireAuth` (controllers/authMiddleware.go)
- Tiene un nuevo middleware `RequireAdmin` para rutas solo admin
- Protege `/api/red` con `RequireAuth`

### Variables de entorno nuevas

Agrega a tu `.env`:

```env
JWT_SECRET=clave-secreta-multicatalogo-cambiar-en-produccion
```

Ver `.env.example` para el formato completo.
