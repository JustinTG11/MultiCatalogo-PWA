package controllers

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ProductoController agrupa los endpoints del catálogo.
type ProductoController struct {
	repo repository.ProductoRepository
}

// NewProductoController inyecta el repositorio de productos.
func NewProductoController(repo repository.ProductoRepository) *ProductoController {
	return &ProductoController{repo: repo}
}

// GetProductos devuelve el catálogo completo (200).
func (h *ProductoController) GetProductos(c *fiber.Ctx) error {
	// GET /api/productos?q=texto -> búsqueda server-side (ILIKE); sin q devuelve el catálogo cacheado.
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		resultados, err := h.repo.BuscarProductos(q)
		if err != nil {
			return err
		}
		return c.JSON(resultados)
	}

	productos, err := h.repo.GetProductos()
	if err != nil {
		return err
	}
	return c.JSON(productos)
}

// GetProductoPorID devuelve un producto.
//
//	400 -> el :id no es un entero positivo
//	404 -> el producto no existe
func (h *ProductoController) GetProductoPorID(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del producto debe ser un número entero positivo",
			map[string]string{"id": raw})
	}

	producto, ok, err := h.repo.GetProductoByID(id)
	if err != nil {
		return err
	}
	if !ok {
		return SendError(c, fiber.StatusNotFound, fmt.Sprintf("El producto con id %d no existe", id), nil)
	}
	return c.JSON(producto)
}

// GetProductosAdmin devuelve todos los productos incluyendo inactivos (solo admin).
func (h *ProductoController) GetProductosAdmin(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	productos, total, err := h.repo.GetProductosAdmin(strings.TrimSpace(c.Query("q")), page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"data": productos, "page": page, "limit": limit, "total": total})
}

// CrearProducto crea un nuevo producto (solo admin).
func (h *ProductoController) CrearProducto(c *fiber.Ctx) error {
	var req models.CrearProductoRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}

	// Validación básica
	if req.Nombre == "" {
		return SendError(c, fiber.StatusBadRequest, "El nombre es obligatorio", nil)
	}
	if strings.TrimSpace(req.Categoria) == "" {
		return SendError(c, fiber.StatusBadRequest, "La categoría es obligatoria", nil)
	}
	if req.Precio <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El precio debe ser mayor que cero", nil)
	}
	if req.Stock < 0 {
		return SendError(c, fiber.StatusBadRequest, "El stock no puede ser negativo", nil)
	}

	producto, err := h.repo.CrearProducto(req)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(producto)
}

// ActualizarProducto modifica un producto existente (solo admin).
func (h *ProductoController) ActualizarProducto(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del producto debe ser un número entero positivo", nil)
	}

	var req models.ActualizarProductoRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}

	producto, ok, err := h.repo.ActualizarProducto(id, req)
	if err != nil {
		return err
	}
	if !ok {
		return SendError(c, fiber.StatusNotFound, fmt.Sprintf("El producto con id %d no existe", id), nil)
	}

	return c.JSON(producto)
}

// EliminarProducto hace borrado lógico de un producto (solo admin).
func (h *ProductoController) EliminarProducto(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del producto debe ser un número entero positivo", nil)
	}

	if err := h.repo.EliminarProducto(id); err != nil {
		if err.Error() == "producto no encontrado" {
			return SendError(c, fiber.StatusNotFound, fmt.Sprintf("El producto con id %d no existe", id), nil)
		}
		return err
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

// BuscarProductos busca productos por nombre o categoría (query param ?q=).
func (h *ProductoController) BuscarProductos(c *fiber.Ctx) error {
	query := c.Query("q", "")
	if query == "" {
		return h.GetProductos(c)
	}

	productos, err := h.repo.BuscarProductos(query)
	if err != nil {
		return err
	}
	return c.JSON(productos)
}
