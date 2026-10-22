// Paquete repository: capa de acceso a datos. Por ahora usa datos en memoria; en la
// siguiente fase se reemplazará por PostgreSQL sin tocar controladores ni rutas.
package repository

import (
	"strings"

	"multicatalogo-backend/models"
)

var usuarios = []models.Usuario{
	{Email: "admin@upse.edu.ec", Password: "123456", Rol: "admin", Token: "fake-jwt-token-123"},
	{Email: "cliente@upse.edu.ec", Password: "123456", Rol: "cliente", Token: "fake-jwt-token-456"},
}

func galeria(seed string) []string {
	base := "https://picsum.photos/seed/"
	return []string{base + seed + "1/600", base + seed + "2/600", base + seed + "3/600"}
}

func producto(id int, nombre, desc, cat, seed string, precio float64) models.Producto {
	return models.Producto{
		ID: id, Nombre: nombre, Descripcion: desc, Precio: precio, Categoria: cat,
		Img: "https://picsum.photos/seed/" + seed + "/600", Galeria: galeria(seed),
	}
}

var productos = []models.Producto{
	producto(1, "Serum Revitalizante", "Serum concentrado con vitamina C y ácido hialurónico. Ilumina la piel, reduce manchas y aporta hidratación profunda desde la primera aplicación.", "Serum", "serum", 45.00),
	producto(2, "Crema Hidratante Pro", "Crema facial de textura ligera con niacinamida y manteca de karité. Hidratación de 24 horas y barrera cutánea fortalecida para todo tipo de piel.", "Crema", "crema", 32.50),
	producto(3, "Tónico Purificante", "Tónico sin alcohol con hamamelis y agua de rosas. Limpia poros, equilibra el pH y prepara la piel para el resto de la rutina diaria.", "Tónico", "tonico", 28.00),
	producto(4, "Mascarilla Nocturna", "Mascarilla de noche con colágeno y vitamina E. Repara la piel mientras duermes y recupera la luminosidad al despertar.", "Mascarilla", "mascarilla", 50.00),
	producto(5, "Serum Anti-Edad Retinol", "Serum de retinol encapsulado que suaviza líneas de expresión y mejora la firmeza. Uso nocturno recomendado.", "Serum", "retinol", 58.00),
	producto(6, "Crema Contorno de Ojos", "Contorno de ojos con cafeína y péptidos. Reduce bolsas y ojeras, hidrata la zona más delicada del rostro.", "Crema", "ojos", 26.00),
	producto(7, "Tónico Exfoliante AHA-BHA", "Exfoliación química suave con ácidos AHA y BHA. Renueva la textura de la piel y desobstruye los poros.", "Tónico", "exfoliante", 34.00),
	producto(8, "Kit Rutina Completa", "Kit integral con serum, crema, tónico y mascarilla. La rutina perfecta para comenzar: limpieza, tratamiento e hidratación.", "Kit", "kit", 129.00),
}

var red = models.Referido{
	ID: 0, Nombre: "Tú", Nivel: 0, Ventas: 2400,
	Hijos: []models.Referido{
		{ID: 1, Nombre: "Ana García", Nivel: 1, Ventas: 1200, Hijos: []models.Referido{
			{ID: 4, Nombre: "Carlos Ruiz", Nivel: 2, Ventas: 500, Hijos: []models.Referido{
				{ID: 7, Nombre: "Diana Paz", Nivel: 3, Ventas: 300},
			}},
			{ID: 5, Nombre: "Sofía León", Nivel: 2, Ventas: 430},
		}},
		{ID: 2, Nombre: "Luis Poveda", Nivel: 1, Ventas: 850, Hijos: []models.Referido{
			{ID: 6, Nombre: "Marco Díaz", Nivel: 2, Ventas: 380},
		}},
		{ID: 3, Nombre: "Marta Sánchez", Nivel: 1, Ventas: 430},
	},
}

// FindUsuario valida credenciales. Devuelve (usuario, true) si coinciden.
func FindUsuario(email, password string) (models.Usuario, bool) {
	for _, u := range usuarios {
		if strings.EqualFold(u.Email, email) && u.Password == password {
			return u, true
		}
	}
	return models.Usuario{}, false
}

// GetProductos devuelve el catálogo completo.
func GetProductos() []models.Producto { return productos }

// GetProductoByID busca un producto; el segundo valor indica si existe.
func GetProductoByID(id int) (models.Producto, bool) {
	for _, p := range productos {
		if p.ID == id {
			return p, true
		}
	}
	return models.Producto{}, false
}

// GetRed devuelve el árbol de referidos del usuario.
func GetRed() models.Referido { return red }
