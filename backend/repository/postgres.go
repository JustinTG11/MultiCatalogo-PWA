// Paquete repository: capa de acceso a datos. PostgresRepository consulta PostgreSQL y usa la
// Cache inyectada (Redis) en las lecturas pesadas. No hay variables globales: todo llega por el constructor.
package repository

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"multicatalogo-backend/domain"
	"multicatalogo-backend/models"
)

// Valores de Opciones.FallaSimulada (solo para demostraciones en clase).
const (
	FallaItems = "items" // error justo después de insertar el pedido y antes de insertar el detalle
	FallaPausa = "pausa" // pausa de 10 s antes del COMMIT (para detener la BD con docker kill)

	pausaSimulada = 10 * time.Second
)

// tasasComision son los porcentajes para los ascendentes a distancia 1, 2 y 3 del comprador
// (los mismos 10 % / 5 % / 2 % que muestra el frontend en data/red.ts).
var tasasComision = []int{10, 5, 2}

// Opciones agrupa los ajustes del repositorio.
type Opciones struct {
	FallaSimulada string
}

// PostgresRepository implementa UsuarioRepository, ProductoRepository, RedRepository y PedidoRepository.
type PostgresRepository struct {
	db    *pgxpool.Pool
	cache Cache
	opts  Opciones
}

// NewPostgresRepository recibe sus dependencias ya construidas (inyección por constructor).
func NewPostgresRepository(db *pgxpool.Pool, cache Cache, opts Opciones) *PostgresRepository {
	return &PostgresRepository{db: db, cache: cache, opts: opts}
}

// contexto crea un contexto con tiempo límite para que una consulta lenta no deje colgada la petición.
func contexto() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// ======================= Usuarios =======================

const columnasUsuario = `id, email, password, rol, COALESCE(token, ''), referido_id, COALESCE(activo, true)`

func escanearUsuario(row pgx.Row) (models.Usuario, bool, error) {
	var u models.Usuario
	err := row.Scan(&u.ID, &u.Email, &u.Password, &u.Rol, &u.Token, &u.ReferidoID, &u.Activo)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Usuario{}, false, nil
	}
	if err != nil {
		return models.Usuario{}, false, err
	}
	return u, true, nil
}

// FindUsuario valida credenciales (email sin distinguir mayúsculas).
// El password está hasheado con bcrypt en la BD, se valida con CompareHashAndPassword.
// Devuelve (usuario, true, nil) si coinciden; (vacío, false, nil) si no; y un error solo si falla la BD.
func (r *PostgresRepository) FindUsuario(email, password string) (models.Usuario, bool, error) {
	ctx, cancel := contexto()
	defer cancel()

	// Primero buscar usuario por email (sin validar password aún)
	usuario, ok, err := escanearUsuario(r.db.QueryRow(ctx,
		`SELECT `+columnasUsuario+` FROM usuarios WHERE LOWER(email) = LOWER($1)`, email))
	if err != nil {
		return models.Usuario{}, false, err
	}
	if !ok {
		return models.Usuario{}, false, nil
	}

	// Validar password con bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(usuario.Password), []byte(password)); err != nil {
		return models.Usuario{}, false, nil // password incorrecto
	}

	return usuario, true, nil
}

// FindUsuarioPorEmail identifica al usuario a partir del email (usado tras validar JWT).
func (r *PostgresRepository) FindUsuarioPorEmail(email string) (models.Usuario, bool, error) {
	ctx, cancel := contexto()
	defer cancel()
	return escanearUsuario(r.db.QueryRow(ctx,
		`SELECT `+columnasUsuario+` FROM usuarios WHERE LOWER(email) = LOWER($1)`, email))
}

// ======================= Productos =======================

// columnasProducto: precio se castea a float8 para escanearlo directo a float64.
const columnasProducto = `id, nombre, descripcion, precio::float8, categoria, img, galeria, stock, activo`

func escanearProducto(row pgx.Row) (models.Producto, error) {
	var p models.Producto
	err := row.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &p.Galeria, &p.Stock, &p.Activo)
	return p, err
}

// GetProductos devuelve el catálogo completo ordenado por id (solo activos).
// Cache-Aside: primero Redis (productos:all, TTL 5 min); si no está, PostgreSQL y se guarda.
func (r *PostgresRepository) GetProductos() ([]models.Producto, error) {
	var cacheados []models.Producto
	if r.cache.Get(keyProductos, &cacheados) {
		return cacheados, nil // Cache Hit: no se toca PostgreSQL
	}

	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx, `SELECT `+columnasProducto+` FROM productos WHERE activo = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// make(..., 0) para que, si no hay productos, el JSON sea [] y no null.
	productos := make([]models.Producto, 0)
	for rows.Next() {
		p, err := escanearProducto(rows)
		if err != nil {
			return nil, err
		}
		productos = append(productos, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	r.cache.Set(keyProductos, productos, ttlProductos)
	return productos, nil
}

// BuscarProductos busca productos por nombre o categoría (ILIKE).
func (r *PostgresRepository) BuscarProductos(query string) ([]models.Producto, error) {
	ctx, cancel := contexto()
	defer cancel()

	searchTerm := "%" + query + "%"

	rows, err := r.db.Query(ctx,
		`SELECT `+columnasProducto+` FROM productos
		 WHERE activo = true AND (nombre ILIKE $1 OR categoria ILIKE $1)
		 ORDER BY id`, searchTerm)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productos := make([]models.Producto, 0)
	for rows.Next() {
		p, err := escanearProducto(rows)
		if err != nil {
			return nil, err
		}
		productos = append(productos, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return productos, nil
}

// GetProductoByID busca un producto; el segundo valor indica si existe.
func (r *PostgresRepository) GetProductoByID(id int) (models.Producto, bool, error) {
	ctx, cancel := contexto()
	defer cancel()

	p, err := escanearProducto(r.db.QueryRow(ctx,
		`SELECT `+columnasProducto+` FROM productos WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Producto{}, false, nil
	}
	if err != nil {
		return models.Producto{}, false, err
	}
	return p, true, nil
}

// ======================= Red multinivel =======================

// GetRed devuelve el árbol de referidos del usuario identificado por email.
// Cache-Aside: primero Redis (red:tree:{email}, TTL 10 min); si no está, reconstruye el árbol:
// lee la lista plana de la tabla referidos y arma la jerarquía en memoria a partir de parent_id.
func (r *PostgresRepository) GetRed(email string) (models.Referido, error) {
	key := keyRed(email)
	var cacheado models.Referido
	if r.cache.Get(key, &cacheado) {
		return cacheado, nil // Cache Hit: no se toca PostgreSQL
	}

	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx,
		`SELECT id, nombre, nivel, ventas::float8, comisiones::float8, parent_id, COALESCE(codigo, '')
		   FROM referidos
		  ORDER BY nivel, id`)
	if err != nil {
		return models.Referido{}, err
	}
	defer rows.Close()

	var (
		nodos  []models.Referido
		padres []*int            // padres[i] = parent_id del nodo i (nil si es la raíz)
		hijos  = map[int][]int{} // id del padre -> posiciones de sus hijos en nodos
	)
	for rows.Next() {
		var n models.Referido
		var parent *int
		if err := rows.Scan(&n.ID, &n.Nombre, &n.Nivel, &n.Ventas, &n.Comisiones, &parent, &n.Codigo); err != nil {
			return models.Referido{}, err
		}
		nodos = append(nodos, n)
		padres = append(padres, parent)
	}
	if err := rows.Err(); err != nil {
		return models.Referido{}, err
	}

	raiz := -1
	for i, parent := range padres {
		if parent == nil {
			if raiz == -1 {
				raiz = i
			}
			continue
		}
		hijos[*parent] = append(hijos[*parent], i)
	}
	if raiz == -1 {
		return models.Referido{}, ErrRedVacia
	}

	var construir func(i int) models.Referido
	construir = func(i int) models.Referido {
		nodo := nodos[i]
		for _, h := range hijos[nodo.ID] {
			nodo.Hijos = append(nodo.Hijos, construir(h))
		}
		return nodo
	}
	red := construir(raiz)
	r.cache.Set(key, red, ttlRed)
	return red, nil
}

// ======================= Pedidos (ACID) =======================

// agruparItems une líneas repetidas del mismo producto y las ordena por id. Ordenar es importante:
// si dos compras simultáneas bloquean los productos siempre en el mismo orden, no se produce un deadlock.
func agruparItems(items []models.ItemCheckout) []models.ItemCheckout {
	suma := map[int]int{}
	for _, it := range items {
		suma[it.ProductoID] += it.Cantidad
	}
	agrupados := make([]models.ItemCheckout, 0, len(suma))
	for id, cantidad := range suma {
		agrupados = append(agrupados, models.ItemCheckout{ProductoID: id, Cantidad: cantidad})
	}
	sort.Slice(agrupados, func(i, j int) bool { return agrupados[i].ProductoID < agrupados[j].ProductoID })
	return agrupados
}

// CrearPedido guarda el pedido dentro de UNA transacción (ACID):
//
//	BEGIN
//	  1. INSERT en pedidos
//	  2. por cada item: bloquea el producto, valida stock, INSERT en pedido_items y descuenta stock
//	  3. calcula el total con los precios de la BD
//	COMMIT
//
// Si cualquier paso falla se ejecuta ROLLBACK y no queda NADA guardado (ni pedido, ni items, ni stock descontado).
func (r *PostgresRepository) CrearPedido(ctx context.Context, usuario models.Usuario, req models.CheckoutRequest) (models.PedidoConfirmado, error) {
	// Se valida ANTES de agrupar: agruparItems suma líneas repetidas y (+5, -5) daría 0 sin error.
	for _, it := range req.Items {
		if it.Cantidad <= 0 {
			return models.PedidoConfirmado{}, ErrCantidadInvalida
		}
	}
	items := agruparItems(req.Items)

	tx, err := r.db.Begin(ctx) // BEGIN
	if err != nil {
		return models.PedidoConfirmado{}, fmt.Errorf("iniciar transacción: %w", err)
	}

	confirmado := false
	defer func() {
		if confirmado {
			return
		}
		// Se usa un contexto nuevo: aunque ctx haya vencido, el ROLLBACK debe intentarse igual.
		rbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tx.Rollback(rbCtx); err != nil {
			log.Printf("checkout: ROLLBACK falló (la conexión se cerró y PostgreSQL abortó la transacción): %v", err)
			return
		}
		log.Println("checkout: ROLLBACK ejecutado, no se guardó ningún cambio")
	}()

	// 1) Registro principal del pedido (total en 0; se calcula al final con los precios reales).
	var pedidoID int
	var creado time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, creado_en`,
		usuario.ID, req.Cliente.Nombre, usuario.Email, req.Cliente.Direccion, // email: el del TOKEN, nunca el del body
		req.Cliente.Ciudad, req.Cliente.Telefono, req.MetodoPago,
	).Scan(&pedidoID, &creado)
	if err != nil {
		return models.PedidoConfirmado{}, fmt.Errorf("insertar pedido: %w", err)
	}

	// Punto de inyección de falla para la clase: el pedido YA se insertó pero aún no hay items.
	if r.opts.FallaSimulada == FallaItems {
		log.Println("checkout: [SIMULACIÓN] error forzado después del INSERT del pedido")
		return models.PedidoConfirmado{}, ErrFallaSimulada
	}

	// 2) Detalle del pedido + descuento de stock.
	detalle := make([]models.ItemPedido, 0, len(items))
	for _, it := range items {
		// FOR UPDATE bloquea la fila: dos compras simultáneas no pueden "gastar" el mismo stock.
		var nombre string
		var stock int
		err := tx.QueryRow(ctx,
			`SELECT nombre, stock FROM productos WHERE id = $1 FOR UPDATE`, it.ProductoID,
		).Scan(&nombre, &stock)
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PedidoConfirmado{}, &ErrProductoNoExiste{ID: it.ProductoID}
		}
		if err != nil {
			return models.PedidoConfirmado{}, fmt.Errorf("consultar producto %d: %w", it.ProductoID, err)
		}
		if stock < it.Cantidad {
			return models.PedidoConfirmado{}, &ErrStockInsuficiente{
				ID: it.ProductoID, Nombre: nombre, Disponible: stock, Solicitado: it.Cantidad,
			}
		}

		// El precio sale de la tabla productos, nunca del cliente.
		var precio float64
		err = tx.QueryRow(ctx,
			`INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
			 SELECT $1::int, id, $3::int, precio FROM productos WHERE id = $2::int
			 RETURNING precio_unitario::float8`,
			pedidoID, it.ProductoID, it.Cantidad,
		).Scan(&precio)
		if err != nil {
			return models.PedidoConfirmado{}, fmt.Errorf("insertar item del producto %d: %w", it.ProductoID, err)
		}

		if _, err := tx.Exec(ctx,
			`UPDATE productos SET stock = stock - $1 WHERE id = $2`, it.Cantidad, it.ProductoID); err != nil {
			return models.PedidoConfirmado{}, fmt.Errorf("descontar stock del producto %d: %w", it.ProductoID, err)
		}

		detalle = append(detalle, models.ItemPedido{Nombre: nombre, Cantidad: it.Cantidad, Precio: precio})
	}

	// 3) Total calculado por PostgreSQL con NUMERIC (sin errores de redondeo de float).
	var total float64
	err = tx.QueryRow(ctx,
		`UPDATE pedidos
		    SET total = (SELECT COALESCE(SUM(cantidad * precio_unitario), 0) FROM pedido_items WHERE pedido_id = $1)
		  WHERE id = $1
		  RETURNING total::float8`, pedidoID,
	).Scan(&total)
	if err != nil {
		return models.PedidoConfirmado{}, fmt.Errorf("calcular total: %w", err)
	}

	// 4) Insertar comisiones en el ledger (dentro de la misma transacción)
	if usuario.ReferidoID != nil {
		// Buscar ascendentes hasta 3 niveles
		rows, err := tx.Query(ctx,
			`WITH RECURSIVE ascendentes AS (
			     SELECT r.parent_id AS id, 1 AS distancia
			       FROM referidos r
			      WHERE r.id = $1 AND r.parent_id IS NOT NULL
			     UNION ALL
			     SELECT r.parent_id, a.distancia + 1
			       FROM referidos r
			       JOIN ascendentes a ON r.id = a.id
			      WHERE r.parent_id IS NOT NULL AND a.distancia < 3
			 )
			 SELECT id, distancia FROM ascendentes ORDER BY distancia`, *usuario.ReferidoID)
		if err != nil {
			return models.PedidoConfirmado{}, fmt.Errorf("buscar ascendentes: %w", err)
		}

		type ascendente struct{ id, distancia int }
		var ascendentes []ascendente
		for rows.Next() {
			var a ascendente
			if err := rows.Scan(&a.id, &a.distancia); err != nil {
				rows.Close()
				return models.PedidoConfirmado{}, fmt.Errorf("leer ascendente: %w", err)
			}
			ascendentes = append(ascendentes, a)
		}
		rows.Close()

		// Insertar comisiones (cálculo puro en domain, redondeado a centavos)
		repartos := domain.RepartirComisiones(total, tasasComision)
		for _, a := range ascendentes {
			if a.distancia < 1 || a.distancia > len(repartos) {
				continue
			}
			porcentaje := repartos[a.distancia-1].Porcentaje
			monto := repartos[a.distancia-1].Monto

			_, err = tx.Exec(ctx,
				`INSERT INTO comisiones (pedido_id, referido_id, nivel, porcentaje, monto, estado)
				 VALUES ($1, $2, $3, $4, $5, 'pendiente')`,
				pedidoID, a.id, a.distancia, porcentaje, monto)
			if err != nil {
				return models.PedidoConfirmado{}, fmt.Errorf("insertar comisión: %w", err)
			}
		}
	}

	// Pausa para la demostración "caos de contenedor": detén la BD (docker kill multicatalogo-db) mientras espera.
	if r.opts.FallaSimulada == FallaPausa {
		log.Printf("checkout: [SIMULACIÓN] pausa de %s antes del COMMIT", pausaSimulada)
		select {
		case <-time.After(pausaSimulada):
		case <-ctx.Done():
			return models.PedidoConfirmado{}, ctx.Err()
		}
	}

	if err := tx.Commit(ctx); err != nil { // COMMIT
		return models.PedidoConfirmado{}, fmt.Errorf("confirmar transacción: %w", err)
	}
	confirmado = true

	return models.PedidoConfirmado{
		ID:         pedidoID,
		Numero:     fmt.Sprintf("MC-%06d", pedidoID),
		Items:      detalle,
		Total:      total,
		Cliente:    models.ClientePedido{Nombre: req.Cliente.Nombre, Email: usuario.Email, Ciudad: req.Cliente.Ciudad},
		MetodoPago: req.MetodoPago,
		Fecha:      creado,
	}, nil
}

// ProcesarComisiones acredita la venta al nodo del comprador y las comisiones a sus ascendentes
// (10 % al padre, 5 % al abuelo y 2 % al bisabuelo), todo en una transacción propia.
// Es idempotente: la columna pedidos.comisiones_procesadas impide pagar dos veces el mismo pedido.
func (r *PostgresRepository) ProcesarComisiones(ctx context.Context, pedidoID, referidoID int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transacción: %w", err)
	}
	defer func() {
		// Tras un COMMIT exitoso esto devuelve pgx.ErrTxClosed y no hace nada.
		rbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rbCtx)
	}()

	// Compuerta de idempotencia: solo el primero que la cruza procesa el pedido.
	tag, err := tx.Exec(ctx,
		`UPDATE pedidos SET comisiones_procesadas = TRUE WHERE id = $1 AND NOT comisiones_procesadas AND estado <> 'cancelado'`, pedidoID)
	if err != nil {
		return fmt.Errorf("marcar pedido: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil // ya estaba procesado
	}

	// La compra cuenta como venta del nodo del comprador (esto es lo que suben los KPIs "Ventas de la Red").
	if _, err := tx.Exec(ctx,
		`UPDATE referidos SET ventas = ventas + (SELECT total FROM pedidos WHERE id = $1) WHERE id = $2`,
		pedidoID, referidoID); err != nil {
		return fmt.Errorf("acreditar venta: %w", err)
	}

	// Ascendentes del comprador hasta 3 niveles (consulta recursiva sobre parent_id).
	rows, err := tx.Query(ctx,
		`WITH RECURSIVE ascendentes AS (
		     SELECT r.parent_id AS id, 1 AS distancia
		       FROM referidos r
		      WHERE r.id = $1 AND r.parent_id IS NOT NULL
		     UNION ALL
		     SELECT r.parent_id, a.distancia + 1
		       FROM referidos r
		       JOIN ascendentes a ON r.id = a.id
		      WHERE r.parent_id IS NOT NULL AND a.distancia < 3
		 )
		 SELECT id, distancia FROM ascendentes ORDER BY distancia`, referidoID)
	if err != nil {
		return fmt.Errorf("buscar ascendentes: %w", err)
	}
	type ascendente struct{ id, distancia int }
	var ascendentes []ascendente
	for rows.Next() {
		var a ascendente
		if err := rows.Scan(&a.id, &a.distancia); err != nil {
			rows.Close()
			return fmt.Errorf("leer ascendente: %w", err)
		}
		ascendentes = append(ascendentes, a)
	}
	rows.Close() // hay que cerrar el cursor antes de ejecutar otra sentencia en la misma transacción
	if err := rows.Err(); err != nil {
		return fmt.Errorf("leer ascendentes: %w", err)
	}

	for _, a := range ascendentes {
		if a.distancia < 1 || a.distancia > len(tasasComision) {
			continue
		}
		if _, err := tx.Exec(ctx,
			`UPDATE referidos
			    SET comisiones = comisiones + ROUND((SELECT total FROM pedidos WHERE id = $1) * $2::numeric / 100, 2)
			  WHERE id = $3`,
			pedidoID, tasasComision[a.distancia-1], a.id); err != nil {
			return fmt.Errorf("acreditar comisión al referido %d: %w", a.id, err)
		}
	}

	return tx.Commit(ctx)
}

// ======================= Registro de usuarios =======================

// ReferidoPorCodigo busca el ID del referido por su código (para el registro con referido).
func (r *PostgresRepository) ReferidoPorCodigo(codigo string) (int, bool, error) {
	ctx, cancel := contexto()
	defer cancel()

	var id int
	err := r.db.QueryRow(ctx, `SELECT id FROM referidos WHERE codigo = $1`, codigo).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return id, true, nil
}

// CrearUsuario crea un usuario y su nodo en referidos en una transacción.
// Hashea el password con bcrypt. Si viene código de referido, vincula al parent_id.
func (r *PostgresRepository) CrearUsuario(req models.RegisterRequest) (models.Usuario, error) {
	// Determinar parent_id si hay código de referido
	var parentID *int
	if req.Referido != "" {
		pid, ok, err := r.ReferidoPorCodigo(req.Referido)
		if err != nil {
			return models.Usuario{}, fmt.Errorf("buscar referido: %w", err)
		}
		if !ok {
			return models.Usuario{}, fmt.Errorf("código de referido inválido")
		}
		parentID = &pid
	}

	// Hashear password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return models.Usuario{}, fmt.Errorf("hashear password: %w", err)
	}

	ctx, cancel := contexto()
	defer cancel()

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.Usuario{}, fmt.Errorf("iniciar transacción: %w", err)
	}
	defer func() {
		rbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rbCtx)
	}()

	// 1) Crear nodo en referidos: id desde la secuencia y código de invitación único "U<id>"
	var referidoID int
	nivel := 1
	if parentID != nil {
		if err := tx.QueryRow(ctx, `SELECT nivel + 1 FROM referidos WHERE id = $1`, *parentID).Scan(&nivel); err != nil {
			return models.Usuario{}, fmt.Errorf("leer nivel del referente: %w", err)
		}
	}
	err = tx.QueryRow(ctx,
		`WITH n AS (SELECT nextval('referidos_id_seq')::int AS id)
		 INSERT INTO referidos (id, nombre, nivel, ventas, comisiones, parent_id, codigo)
		 SELECT n.id, $1, $2, 0, 0, $3, 'U' || n.id FROM n
		 RETURNING id`,
		req.Nombre, nivel, parentID).Scan(&referidoID)
	if err != nil {
		return models.Usuario{}, fmt.Errorf("crear referido: %w", err)
	}

	// 2) Crear usuario
	var usuarioID int
	err = tx.QueryRow(ctx,
		`INSERT INTO usuarios (email, password, rol, nombre, referido_id)
		 VALUES ($1, $2, 'cliente', $3, $4)
		 RETURNING id`,
		req.Email, string(hashedPassword), req.Nombre, referidoID).Scan(&usuarioID)
	if err != nil {
		return models.Usuario{}, fmt.Errorf("crear usuario: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Usuario{}, fmt.Errorf("confirmar transacción: %w", err)
	}

	return models.Usuario{
		ID:         usuarioID,
		Email:      req.Email,
		Rol:        "cliente",
		ReferidoID: &referidoID,
	}, nil
}

// ======================= CRUD Productos =======================

const columnasProductoAdmin = `id, nombre, descripcion, precio::float8, categoria, img, galeria, stock, activo`

func escanearProductoAdmin(row pgx.Row) (models.Producto, error) {
	var p models.Producto
	err := row.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &p.Galeria, &p.Stock, &p.Activo)
	return p, err
}

// GetProductosAdmin devuelve productos incluyendo inactivos si se solicita.
func (r *PostgresRepository) GetProductosAdmin(q string, page, limit int) ([]models.Producto, int, error) {
	ctx, cancel := contexto()
	defer cancel()

	// Incluye inactivos. Búsqueda server-side opcional por nombre o categoría (ILIKE).
	filtro := ""
	args := []interface{}{}
	if q != "" {
		filtro = ` WHERE nombre ILIKE $1 OR categoria ILIKE $1`
		args = append(args, "%"+q+"%")
	}

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM productos`+filtro, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, (page-1)*limit)
	rows, err := r.db.Query(ctx,
		`SELECT `+columnasProductoAdmin+` FROM productos`+filtro+
			fmt.Sprintf(` ORDER BY id LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	productos := make([]models.Producto, 0)
	for rows.Next() {
		p, err := escanearProductoAdmin(rows)
		if err != nil {
			return nil, 0, err
		}
		productos = append(productos, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return productos, total, nil
}

// CrearProducto inserta un nuevo producto (admin).
func (r *PostgresRepository) CrearProducto(req models.CrearProductoRequest) (models.Producto, error) {
	ctx, cancel := contexto()
	defer cancel()

	// galeria es NOT NULL: un nil de Go viajaría como NULL, así que se normaliza a arreglo vacío.
	if req.Galeria == nil {
		req.Galeria = []string{}
	}

	var id int
	err := r.db.QueryRow(ctx,
		`INSERT INTO productos (nombre, descripcion, precio, categoria, img, galeria, stock, activo)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		 RETURNING id`,
		req.Nombre, req.Descripcion, req.Precio, req.Categoria, req.Img, req.Galeria, req.Stock).Scan(&id)
	if err != nil {
		return models.Producto{}, fmt.Errorf("crear producto: %w", err)
	}

	// Invalidar caché
	r.cache.DeleteByPattern(keyProductos)

	return models.Producto{
		ID:          id,
		Nombre:      req.Nombre,
		Descripcion: req.Descripcion,
		Precio:      req.Precio,
		Categoria:   req.Categoria,
		Img:         req.Img,
		Galeria:     req.Galeria,
		Stock:       req.Stock,
		Activo:      true,
	}, nil
}

// ActualizarProducto modifica campos de un producto (admin).
func (r *PostgresRepository) ActualizarProducto(id int, req models.ActualizarProductoRequest) (models.Producto, bool, error) {
	ctx, cancel := contexto()
	defer cancel()

	// Construir query dinámico solo con campos no nulos
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Nombre != nil {
		updates = append(updates, fmt.Sprintf("nombre = $%d", argIndex))
		args = append(args, *req.Nombre)
		argIndex++
	}
	if req.Descripcion != nil {
		updates = append(updates, fmt.Sprintf("descripcion = $%d", argIndex))
		args = append(args, *req.Descripcion)
		argIndex++
	}
	if req.Precio != nil {
		updates = append(updates, fmt.Sprintf("precio = $%d", argIndex))
		args = append(args, *req.Precio)
		argIndex++
	}
	if req.Categoria != nil {
		updates = append(updates, fmt.Sprintf("categoria = $%d", argIndex))
		args = append(args, *req.Categoria)
		argIndex++
	}
	if req.Img != nil {
		updates = append(updates, fmt.Sprintf("img = $%d", argIndex))
		args = append(args, *req.Img)
		argIndex++
	}
	if req.Galeria != nil {
		updates = append(updates, fmt.Sprintf("galeria = $%d", argIndex))
		args = append(args, *req.Galeria)
		argIndex++
	}
	if req.Stock != nil {
		updates = append(updates, fmt.Sprintf("stock = $%d", argIndex))
		args = append(args, *req.Stock)
		argIndex++
	}
	if req.Activo != nil {
		updates = append(updates, fmt.Sprintf("activo = $%d", argIndex))
		args = append(args, *req.Activo)
		argIndex++
	}

	if len(updates) == 0 {
		return models.Producto{}, false, nil // nada que actualizar
	}

	args = append(args, id)
	query := fmt.Sprintf("UPDATE productos SET %s WHERE id = $%d RETURNING id", strings.Join(updates, ", "), argIndex)

	var productID int
	err := r.db.QueryRow(ctx, query, args...).Scan(&productID)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Producto{}, false, nil
	}
	if err != nil {
		return models.Producto{}, false, fmt.Errorf("actualizar producto: %w", err)
	}

	// Invalidar caché
	r.cache.DeleteByPattern(keyProductos)

	// Retornar producto actualizado
	p, ok, err := r.GetProductoByID(id)
	if err != nil {
		return models.Producto{}, false, err
	}
	if !ok {
		return models.Producto{}, false, nil
	}

	return p, true, nil
}

// EliminarProducto hace borrado lógico (activo = false).
func (r *PostgresRepository) EliminarProducto(id int) error {
	ctx, cancel := contexto()
	defer cancel()

	result, err := r.db.Exec(ctx, `UPDATE productos SET activo = false WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("eliminar producto: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("producto no encontrado")
	}

	// Invalidar caché
	r.cache.DeleteByPattern(keyProductos)

	return nil
}

// ======================= Gestión de Pedidos =======================

// GetPedidosMios devuelve los pedidos del usuario (paginado).
func (r *PostgresRepository) GetPedidosMios(usuarioID int, page, limit int) ([]models.PedidoDetalle, int, error) {
	ctx, cancel := contexto()
	defer cancel()

	offset := (page - 1) * limit

	// Contar total
	var total int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM pedidos WHERE usuario_id = $1`, usuarioID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Obtener pedidos
	rows, err := r.db.Query(ctx,
		`SELECT id, 'MC-' || LPAD(id::text, 6, '0'), total::float8, estado, cliente_nombre, cliente_email, ciudad, creado_en
		 FROM pedidos WHERE usuario_id = $1
		 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
		usuarioID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	pedidos := make([]models.PedidoDetalle, 0)
	for rows.Next() {
		var p models.PedidoDetalle
		err := rows.Scan(&p.ID, &p.Numero, &p.Total, &p.Estado, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Fecha)
		if err != nil {
			return nil, 0, err
		}
		pedidos = append(pedidos, p)
	}

	return pedidos, total, nil
}

// GetPedidosAdmin devuelve todos los pedidos (paginado, opcionalmente filtrado por estado).
func (r *PostgresRepository) GetPedidosAdmin(estado string, page, limit int) ([]models.PedidoDetalle, int, error) {
	ctx, cancel := contexto()
	defer cancel()

	offset := (page - 1) * limit

	// Construir query con filtro opcional
	var query string
	var args []interface{}
	baseQuery := `SELECT id, 'MC-' || LPAD(id::text, 6, '0'), total::float8, estado, cliente_nombre, cliente_email, ciudad, creado_en FROM pedidos`

	if estado != "" {
		query = baseQuery + ` WHERE estado = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`
		args = []interface{}{estado, limit, offset}
	} else {
		query = baseQuery + ` ORDER BY creado_en DESC LIMIT $1 OFFSET $2`
		args = []interface{}{limit, offset}
	}

	// Contar total
	var total int
	var countQuery string
	if estado != "" {
		countQuery = `SELECT COUNT(*) FROM pedidos WHERE estado = $1`
		err := r.db.QueryRow(ctx, countQuery, estado).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	} else {
		countQuery = `SELECT COUNT(*) FROM pedidos`
		err := r.db.QueryRow(ctx, countQuery).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	}

	// Obtener pedidos
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	pedidos := make([]models.PedidoDetalle, 0)
	for rows.Next() {
		var p models.PedidoDetalle
		err := rows.Scan(&p.ID, &p.Numero, &p.Total, &p.Estado, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Fecha)
		if err != nil {
			return nil, 0, err
		}
		pedidos = append(pedidos, p)
	}

	return pedidos, total, nil
}

// GetPedidoPorID devuelve un pedido con sus items.
func (r *PostgresRepository) GetPedidoPorID(pedidoID int) (models.PedidoDetalle, bool, error) {
	ctx, cancel := contexto()
	defer cancel()

	// Obtener cabecera
	var p models.PedidoDetalle
	err := r.db.QueryRow(ctx,
		`SELECT id, 'MC-' || LPAD(id::text, 6, '0'), total::float8, estado, cliente_nombre, cliente_email, ciudad, creado_en
		 FROM pedidos WHERE id = $1`, pedidoID).Scan(
		&p.ID, &p.Numero, &p.Total, &p.Estado, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Fecha)
	if err == nil {
		err = r.db.QueryRow(ctx, `SELECT usuario_id FROM pedidos WHERE id = $1`, pedidoID).Scan(&p.UsuarioID)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return models.PedidoDetalle{}, false, nil
	}
	if err != nil {
		return models.PedidoDetalle{}, false, err
	}

	// Obtener items
	rows, err := r.db.Query(ctx,
		`SELECT pr.nombre, pi.cantidad, pi.precio_unitario::float8
		 FROM pedido_items pi JOIN productos pr ON pr.id = pi.producto_id
		 WHERE pi.pedido_id = $1 ORDER BY pi.id`, pedidoID)
	if err != nil {
		return models.PedidoDetalle{}, false, err
	}
	defer rows.Close()

	p.Items = make([]models.ItemPedido, 0)
	for rows.Next() {
		var item models.ItemPedido
		err := rows.Scan(&item.Nombre, &item.Cantidad, &item.Precio)
		if err != nil {
			return models.PedidoDetalle{}, false, err
		}
		p.Items = append(p.Items, item)
	}

	return p, true, nil
}

// ActualizarEstadoPedido cambia el estado de un pedido (admin), todo en UNA transacción.
// El pedido se bloquea (FOR UPDATE) antes de leer su estado: dos cancelaciones simultáneas no pueden
// devolver el stock dos veces. Si el nuevo estado es "cancelado", devuelve el stock y revierte
// las comisiones que aún están pendientes (las ya pagadas quedan como registro del pago).
func (r *PostgresRepository) ActualizarEstadoPedido(pedidoID int, nuevoEstado string) error {
	ctx, cancel := contexto()
	defer cancel()

	validas := map[string][]string{
		"pendiente":  {"preparando", "cancelado"},
		"preparando": {"enviado", "cancelado"},
		"enviado":    {"entregado"},
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transacción: %w", err)
	}
	defer func() {
		rbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rbCtx)
	}()

	var actual string
	var acreditado bool
	err = tx.QueryRow(ctx, `SELECT estado, comisiones_procesadas FROM pedidos WHERE id = $1 FOR UPDATE`, pedidoID).Scan(&actual, &acreditado)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPedidoNoEncontrado
	}
	if err != nil {
		return err
	}

	permitido := false
	for _, e := range validas[actual] {
		if e == nuevoEstado {
			permitido = true
			break
		}
	}
	if !permitido {
		return fmt.Errorf("%w: %s → %s", ErrTransicionInvalida, actual, nuevoEstado)
	}

	if _, err := tx.Exec(ctx, `UPDATE pedidos SET estado = $1 WHERE id = $2`, nuevoEstado, pedidoID); err != nil {
		return fmt.Errorf("actualizar estado: %w", err)
	}

	if nuevoEstado == "cancelado" {
		if _, err := tx.Exec(ctx,
			`UPDATE productos p SET stock = p.stock + pi.cantidad
			   FROM pedido_items pi WHERE pi.pedido_id = $1 AND pi.producto_id = p.id`, pedidoID); err != nil {
			return fmt.Errorf("devolver stock: %w", err)
		}
		if acreditado {
			// Los contadores de referidos ya se habían acreditado (ProcesarComisiones): se deshacen.
			if _, err := tx.Exec(ctx,
				`UPDATE referidos r SET comisiones = r.comisiones - c.monto
				   FROM comisiones c WHERE c.pedido_id = $1 AND c.estado = 'pendiente' AND c.referido_id = r.id`, pedidoID); err != nil {
				return fmt.Errorf("revertir saldo de comisiones: %w", err)
			}
			if _, err := tx.Exec(ctx,
				`UPDATE referidos SET ventas = ventas - (SELECT total FROM pedidos WHERE id = $1)
				  WHERE id = (SELECT u.referido_id FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $1)`, pedidoID); err != nil {
				return fmt.Errorf("revertir ventas: %w", err)
			}
		}
		if _, err := tx.Exec(ctx,
			`UPDATE comisiones SET estado = 'revertida' WHERE pedido_id = $1 AND estado = 'pendiente'`, pedidoID); err != nil {
			return fmt.Errorf("revertir comisiones: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("confirmar transacción: %w", err)
	}

	if nuevoEstado == "cancelado" {
		r.cache.DeleteByPattern(keyProductos)
		r.cache.DeleteByPattern("red:tree:*")
	}
	return nil
}

// ======================= Red Propia =======================

// GetRedMia devuelve el subárbol desde el referido_id del usuario.
func (r *PostgresRepository) GetRedMia(referidoID int) (models.Referido, error) {
	ctx, cancel := contexto()
	defer cancel()

	// Construir el árbol desde el nodo del usuario (recursivo en memoria)
	rows, err := r.db.Query(ctx,
		`SELECT id, nombre, nivel, ventas::float8, comisiones::float8, parent_id, COALESCE(codigo, '')
		   FROM referidos
		  ORDER BY nivel, id`)
	if err != nil {
		return models.Referido{}, err
	}
	defer rows.Close()

	var (
		nodos  []models.Referido
		padres []*int
		hijos  = map[int][]int{}
	)
	for rows.Next() {
		var n models.Referido
		var parent *int
		if err := rows.Scan(&n.ID, &n.Nombre, &n.Nivel, &n.Ventas, &n.Comisiones, &parent, &n.Codigo); err != nil {
			return models.Referido{}, err
		}
		nodos = append(nodos, n)
		padres = append(padres, parent)
		if parent != nil {
			hijos[*parent] = append(hijos[*parent], len(nodos)-1)
		}
	}
	if err := rows.Err(); err != nil {
		return models.Referido{}, err
	}

	// Encontrar el nodo del usuario
	indiceUsuario := -1
	for i, n := range nodos {
		if n.ID == referidoID {
			indiceUsuario = i
			break
		}
	}
	if indiceUsuario == -1 {
		return models.Referido{}, fmt.Errorf("referido no encontrado")
	}

	// Subárbol recursivo con el nivel RELATIVO al usuario (él = 0, sus directos = 1...) y solo hasta
	// la profundidad que paga comisión (len(tasasComision) niveles).
	var construirSubarbol func(i, profundidad int) models.Referido
	construirSubarbol = func(i, profundidad int) models.Referido {
		nodo := nodos[i]
		nodo.Nivel = profundidad
		if profundidad < len(tasasComision) {
			for _, h := range hijos[nodo.ID] {
				nodo.Hijos = append(nodo.Hijos, construirSubarbol(h, profundidad+1))
			}
		}
		return nodo
	}

	return construirSubarbol(indiceUsuario, 0), nil
}

// ======================= Liquidaciones =======================

// Liquidar crea una liquidación y marca comisiones como pagadas (transacción).
func (r *PostgresRepository) Liquidar(referidoID int) (models.Liquidacion, error) {
	ctx, cancel := contexto()
	defer cancel()

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.Liquidacion{}, fmt.Errorf("iniciar transacción: %w", err)
	}
	defer func() {
		rbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rbCtx)
	}()

	// Bloquea las comisiones pendientes del referido (FOR UPDATE no se permite junto a SUM) y las suma.
	rows, err := tx.Query(ctx,
		`SELECT id, monto::float8 FROM comisiones WHERE referido_id = $1 AND estado = 'pendiente' ORDER BY id FOR UPDATE`,
		referidoID)
	if err != nil {
		return models.Liquidacion{}, fmt.Errorf("leer comisiones: %w", err)
	}
	var ids []int
	var total float64
	for rows.Next() {
		var id int
		var monto float64
		if err := rows.Scan(&id, &monto); err != nil {
			rows.Close()
			return models.Liquidacion{}, fmt.Errorf("leer comisión: %w", err)
		}
		ids = append(ids, id)
		total += monto
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return models.Liquidacion{}, fmt.Errorf("leer comisiones: %w", err)
	}
	if len(ids) == 0 {
		return models.Liquidacion{}, ErrSinComisiones
	}

	var liq models.Liquidacion
	err = tx.QueryRow(ctx,
		`INSERT INTO liquidaciones (referido_id, total, estado, pagada_en)
		 VALUES ($1, ROUND($2::numeric, 2), 'pagada', NOW())
		 RETURNING id, referido_id, total::float8, estado, creado_en, pagada_en`,
		referidoID, total).Scan(&liq.ID, &liq.ReferidoID, &liq.Total, &liq.Estado, &liq.CreadoEn, &liq.PagadaEn)
	if err != nil {
		return models.Liquidacion{}, fmt.Errorf("crear liquidación: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE comisiones SET estado = 'pagada', liquidacion_id = $1 WHERE id = ANY($2)`, liq.ID, ids); err != nil {
		return models.Liquidacion{}, fmt.Errorf("marcar comisiones: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Liquidacion{}, fmt.Errorf("confirmar transacción: %w", err)
	}
	return liq, nil
}

// GetLiquidaciones devuelve las liquidaciones de un referido.
func (r *PostgresRepository) GetLiquidaciones(referidoID int) ([]models.Liquidacion, error) {
	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx,
		`SELECT id, referido_id, total::float8, estado, creado_en, pagada_en
		 FROM liquidaciones WHERE referido_id = $1 ORDER BY creado_en DESC`, referidoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	liquidaciones := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		err := rows.Scan(&l.ID, &l.ReferidoID, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn)
		if err != nil {
			return nil, err
		}
		liquidaciones = append(liquidaciones, l)
	}

	return liquidaciones, nil
}

// GetLiquidacionesAdmin devuelve todas las liquidaciones.
func (r *PostgresRepository) GetLiquidacionesAdmin() ([]models.Liquidacion, error) {
	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx,
		`SELECT l.id, l.referido_id, r.nombre, l.total::float8, l.estado, l.creado_en, l.pagada_en
		 FROM liquidaciones l JOIN referidos r ON r.id = l.referido_id
		 ORDER BY l.creado_en DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	liquidaciones := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.ReferidoNombre, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn); err != nil {
			return nil, err
		}
		liquidaciones = append(liquidaciones, l)
	}
	return liquidaciones, rows.Err()
}

// ======================= Reportes =======================

// GetResumen devuelve el resumen de ventas en un periodo.
func (r *PostgresRepository) GetResumen(desde, hasta string) (models.ReporteResumen, error) {
	ctx, cancel := contexto()
	defer cancel()

	var resumen models.ReporteResumen

	// Los pedidos cancelados no cuentan como venta. El periodo (fechas YYYY-MM-DD, ambas inclusivas) es opcional.
	filtro := ` WHERE estado <> 'cancelado'`
	args := []interface{}{}
	if desde != "" {
		args = append(args, desde)
		filtro += fmt.Sprintf(` AND creado_en >= $%d::date`, len(args))
	}
	if hasta != "" {
		args = append(args, hasta)
		filtro += fmt.Sprintf(` AND creado_en < $%d::date + 1`, len(args))
	}

	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0)::float8, COUNT(*), COALESCE(AVG(total), 0)::float8 FROM pedidos`+filtro, args...,
	).Scan(&resumen.TotalVendido, &resumen.NumPedidos, &resumen.TicketPromedio)
	if err != nil {
		return models.ReporteResumen{}, err
	}

	// Comisiones devengadas (pendientes + pagadas) de los pedidos del mismo periodo.
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(c.monto), 0)::float8 FROM comisiones c
		   JOIN pedidos pe ON pe.id = c.pedido_id
		  WHERE c.estado IN ('pendiente', 'pagada')`+strings.ReplaceAll(strings.TrimPrefix(filtro, " WHERE estado <> 'cancelado'"), "creado_en", "pe.creado_en"),
		args...,
	).Scan(&resumen.ComisionesTotal)
	if err != nil {
		return models.ReporteResumen{}, err
	}

	return resumen, nil
}

// GetTopProductos devuelve los productos más vendidos.
func (r *PostgresRepository) GetTopProductos(limit int) ([]models.TopProducto, error) {
	ctx, cancel := contexto()
	defer cancel()

	if limit <= 0 || limit > 100 {
		limit = 10
	}

	rows, err := r.db.Query(ctx,
		`SELECT p.id, p.nombre, SUM(pi.cantidad) as cantidad, SUM(pi.cantidad * pi.precio_unitario)::float8 as total
		 FROM pedido_items pi
		 JOIN productos p ON pi.producto_id = p.id
		 JOIN pedidos pe ON pe.id = pi.pedido_id AND pe.estado <> 'cancelado'
		 GROUP BY p.id, p.nombre
		 ORDER BY total DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productos := make([]models.TopProducto, 0)
	for rows.Next() {
		var tp models.TopProducto
		err := rows.Scan(&tp.ID, &tp.Nombre, &tp.Cantidad, &tp.Total)
		if err != nil {
			return nil, err
		}
		productos = append(productos, tp)
	}

	return productos, nil
}

// GetTopReferidos devuelve los referidos con más ventas.
func (r *PostgresRepository) GetTopReferidos(limit int) ([]models.TopReferido, error) {
	ctx, cancel := contexto()
	defer cancel()

	if limit <= 0 || limit > 100 {
		limit = 10
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, nombre, ventas::float8 FROM referidos ORDER BY ventas DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	referidos := make([]models.TopReferido, 0)
	for rows.Next() {
		var tr models.TopReferido
		err := rows.Scan(&tr.ID, &tr.Nombre, &tr.Ventas)
		if err != nil {
			return nil, err
		}
		referidos = append(referidos, tr)
	}

	return referidos, nil
}

// GetComisionesPendientes devuelve la deuda de comisiones por distribuidor.
func (r *PostgresRepository) GetComisionesPendientes() ([]models.TopReferido, error) {
	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx,
		`SELECT r.id, r.nombre, COALESCE(SUM(c.monto), 0)::float8 as ventas
		 FROM referidos r
		 LEFT JOIN comisiones c ON r.id = c.referido_id AND c.estado = 'pendiente'
		 GROUP BY r.id, r.nombre
		 HAVING COALESCE(SUM(c.monto), 0) > 0
		 ORDER BY ventas DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	deuda := make([]models.TopReferido, 0)
	for rows.Next() {
		var tr models.TopReferido
		err := rows.Scan(&tr.ID, &tr.Nombre, &tr.Ventas)
		if err != nil {
			return nil, err
		}
		deuda = append(deuda, tr)
	}

	return deuda, nil
}

// ======================= Comisiones =======================

// GetComisionesMias devuelve las comisiones del referido.
func (r *PostgresRepository) GetComisionesMias(referidoID int) ([]models.Comision, models.ComisionesResumen, error) {
	ctx, cancel := contexto()
	defer cancel()

	rows, err := r.db.Query(ctx,
		`SELECT id, pedido_id, referido_id, nivel, porcentaje, monto::float8, estado, creado_en
		 FROM comisiones WHERE referido_id = $1 ORDER BY creado_en DESC`, referidoID)
	if err != nil {
		return nil, models.ComisionesResumen{}, err
	}
	defer rows.Close()

	comisiones := make([]models.Comision, 0)
	var pendiente, pagada float64
	for rows.Next() {
		var c models.Comision
		err := rows.Scan(&c.ID, &c.PedidoID, &c.ReferidoID, &c.Nivel, &c.Porcentaje, &c.Monto, &c.Estado, &c.CreadoEn)
		if err != nil {
			return nil, models.ComisionesResumen{}, err
		}
		comisiones = append(comisiones, c)

		switch c.Estado {
		case "pendiente":
			pendiente += c.Monto
		case "pagada":
			pagada += c.Monto
		}
	}

	resumen := models.ComisionesResumen{
		Pendiente: pendiente,
		Pagada:    pagada,
		Total:     pendiente + pagada,
	}

	return comisiones, resumen, nil
}

// GetUsuarios lista usuarios (admin), paginado y con búsqueda opcional por email o nombre (ILIKE).
func (r *PostgresRepository) GetUsuarios(q string, page, limit int) ([]models.UsuarioResumen, int, error) {
	ctx, cancel := contexto()
	defer cancel()

	filtro := ""
	args := []interface{}{}
	if q != "" {
		filtro = ` WHERE email ILIKE $1 OR COALESCE(nombre, '') ILIKE $1`
		args = append(args, "%"+q+"%")
	}

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM usuarios`+filtro, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, (page-1)*limit)
	rows, err := r.db.Query(ctx,
		`SELECT id, email, COALESCE(nombre, ''), rol, COALESCE(activo, true), referido_id, COALESCE(creado_en, NOW())
		   FROM usuarios`+filtro+fmt.Sprintf(` ORDER BY id LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	usuarios := make([]models.UsuarioResumen, 0)
	for rows.Next() {
		var u models.UsuarioResumen
		if err := rows.Scan(&u.ID, &u.Email, &u.Nombre, &u.Rol, &u.Activo, &u.ReferidoID, &u.CreadoEn); err != nil {
			return nil, 0, err
		}
		usuarios = append(usuarios, u)
	}
	return usuarios, total, rows.Err()
}
