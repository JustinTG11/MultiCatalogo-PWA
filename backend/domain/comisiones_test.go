package domain

import "testing"

func TestRepartirComisiones(t *testing.T) {
	r := RepartirComisiones(100, []int{10, 5, 2})
	want := []float64{10, 5, 2}
	if len(r) != 3 {
		t.Fatalf("esperaba 3 niveles, hubo %d", len(r))
	}
	for i, w := range want {
		if r[i].Monto != w || r[i].Nivel != i+1 {
			t.Errorf("nivel %d: monto %v, esperado %v", i+1, r[i].Monto, w)
		}
	}
}

func TestRepartirComisionesRedondeaACentavos(t *testing.T) {
	// 32.50 × 2 % = 0.65 ; 45.00 × 5 % = 2.25 ; 129.99 × 10 % = 12.999 → 13.00
	if m := RepartirComisiones(129.99, []int{10})[0].Monto; m != 13.00 {
		t.Errorf("129.99 × 10 %% = %v, esperado 13.00", m)
	}
	if m := RepartirComisiones(32.50, []int{2})[0].Monto; m != 0.65 {
		t.Errorf("32.50 × 2 %% = %v, esperado 0.65", m)
	}
}

func TestRepartirComisionesTotalCero(t *testing.T) {
	for _, r := range RepartirComisiones(0, []int{10, 5, 2}) {
		if r.Monto != 0 {
			t.Errorf("total 0 debe dar monto 0, dio %v", r.Monto)
		}
	}
}
