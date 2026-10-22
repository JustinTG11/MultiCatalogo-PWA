-- Migración 005: Seguridad con bcrypt y JWT
-- Convierte passwords en texto plano a hashes bcrypt (cost factor 10)
-- Habilita pgcrypto para funciones criptográficas
-- Aplicable a base de datos existente (idempotente con IF NOT EXISTS)

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
