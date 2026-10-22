-- Migración 003: Seguridad (bcrypt, pgcrypto) + índices
-- Convierte passwords en texto plano a hashes bcrypt (cost factor 10)
-- Habilita pgcrypto para funciones criptográficas
-- Aplicable a base de datos existente (idempotente)

-- Habilitar extensión pgcrypto (necesaria para bcrypt en PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Actualizar passwords de usuarios existentes a bcrypt
-- Password original: "123456" → hash bcrypt (cost 10)
-- crypt(gen_salt('bf'), password) genera el hash con bcrypt
UPDATE usuarios
SET password = crypt('123456', gen_salt('bf'))
WHERE email = 'admin@upse.edu.ec' AND password = '123456';

UPDATE usuarios
SET password = crypt('123456', gen_salt('bf'))
WHERE email = 'cliente@upse.edu.ec' AND password = '123456';

-- Índices (idempotentes). init.sql ya los crea en instalaciones nuevas; esto cubre bases existentes.
CREATE INDEX IF NOT EXISTS idx_referidos_parent      ON referidos(parent_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido   ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria   ON productos(categoria);
