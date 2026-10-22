package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/repository"
)

// ReportesController maneja las consultas de agregación.
type ReportesController struct {
	repo repository.ReportesRepository
}

// NewReportesController crea el controlador de reportes.
func NewReportesController(repo repository.ReportesRepository) *ReportesController {
	return &ReportesController{repo: repo}
}

// GetResumen devuelve el resumen de ventas (solo admin).
func (r *ReportesController) GetResumen(c *fiber.Ctx) error {
	desde := c.Query("desde", "")
	hasta := c.Query("hasta", "")

	resumen, err := r.repo.GetResumen(desde, hasta)
	if err != nil {
		return err
	}
	return c.JSON(resumen)
}

// GetTopProductos devuelve los productos más vendidos (solo admin).
func (r *ReportesController) GetTopProductos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	productos, err := r.repo.GetTopProductos(limit)
	if err != nil {
		return err
	}
	return c.JSON(productos)
}

// GetTopReferidos devuelve los referidos con más ventas (solo admin).
func (r *ReportesController) GetTopReferidos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	referidos, err := r.repo.GetTopReferidos(limit)
	if err != nil {
		return err
	}
	return c.JSON(referidos)
}

// GetComisionesPendientes devuelve la deuda de comisiones por distribuidor (solo admin).
func (r *ReportesController) GetComisionesPendientes(c *fiber.Ctx) error {
	deuda, err := r.repo.GetComisionesPendientes()
	if err != nil {
		return err
	}
	return c.JSON(deuda)
}
