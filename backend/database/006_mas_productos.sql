-- Productos adicionales (idempotente: ON CONFLICT DO NOTHING si hay PK)
INSERT INTO productos (id, nombre, descripcion, precio, categoria, img, galeria) VALUES
  (9, 'Gel Limpiador Suave', 'Limpiador facial sin sulfatos con extracto de aloe.', 22.00, 'Limpieza', 'https://picsum.photos/seed/limpiador/600', ARRAY['https://picsum.photos/seed/limpiador1/600']),
  (10, 'Agua Micelar 3 en 1', 'Desmaquilla, limpia y tonifica en un solo paso.', 18.50, 'Limpieza', 'https://picsum.photos/seed/micelar/600', ARRAY['https://picsum.photos/seed/micelar1/600']),
  (11, 'Protector Solar FPS 50', 'Protección UVA/UVB, textura ultraligera.', 36.00, 'Protector solar', 'https://picsum.photos/seed/solar/600', ARRAY['https://picsum.photos/seed/solar1/600']),
  (12, 'Serum Niacinamida 10%', 'Controla sebo y minimiza poros.', 39.00, 'Serum', 'https://picsum.photos/seed/niacinamida/600', ARRAY['https://picsum.photos/seed/niacinamida1/600']),
  (13, 'Crema Reparadora Ceramida', 'Restaura la barrera cutánea.', 42.00, 'Crema', 'https://picsum.photos/seed/ceramida/600', ARRAY['https://picsum.photos/seed/ceramida1/600']),
  (14, 'Mascarilla de Arcilla Verde', 'Purifica y matifica.', 24.00, 'Mascarilla', 'https://picsum.photos/seed/arcilla/600', ARRAY['https://picsum.photos/seed/arcilla1/600']),
  (15, 'Kit Viaje Esenciales', 'Tamaños travel de la rutina básica.', 49.00, 'Kit', 'https://picsum.photos/seed/viaje/600', ARRAY['https://picsum.photos/seed/viaje1/600']),
  (16, 'Bálsamo Labial SPF 15', 'Hidratación labial con SPF.', 12.00, 'Protector solar', 'https://picsum.photos/seed/labial/600', ARRAY['https://picsum.photos/seed/labial1/600'])
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('productos', 'id'), (SELECT MAX(id) FROM productos));
