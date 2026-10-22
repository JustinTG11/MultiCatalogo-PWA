// Paquete domain: reglas de negocio puras (sin base de datos ni HTTP), fáciles de probar.
package domain

import "math"

// Reparto es la comisión que le corresponde a un ascendente de la venta.
type Reparto struct {
	Nivel      int     // 1 = padre del comprador, 2 = abuelo, 3 = bisabuelo
	Porcentaje int     // tasa aplicada (10, 5, 2...)
	Monto      float64 // en dólares, redondeado a centavos
}

// RepartirComisiones calcula la comisión de cada nivel sobre el total de la venta.
// tasas[0] aplica al nivel 1, tasas[1] al nivel 2, etc. Trabaja en centavos enteros
// (redondeo half-up) para que ni los floats ni los redondeos descuadren el ledger.
func RepartirComisiones(total float64, tasas []int) []Reparto {
	centavos := int64(math.Round(total * 100))
	out := make([]Reparto, 0, len(tasas))
	for i, t := range tasas {
		monto := (centavos*int64(t) + 50) / 100
		out = append(out, Reparto{Nivel: i + 1, Porcentaje: t, Monto: float64(monto) / 100})
	}
	return out
}
