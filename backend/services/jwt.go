// Paquete services: lógica de dominio reutilizable sin dependencias HTTP.
package services

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims define los claims del token JWT.
type JWTClaims struct {
	Email string `json:"email"`
	Rol   string `json:"rol"`
	jwt.RegisteredClaims
}

// JWTService maneja la generación y validación de tokens JWT.
type JWTService struct {
	secret []byte
}

// NewJWTService crea un nuevo servicio JWT con el secreto proporcionado.
func NewJWTService(secret string) *JWTService {
	return &JWTService{secret: []byte(secret)}
}

// GenerarToken crea un JWT con claims {sub, email, rol, iat, exp} (+ iss), expira en 2 horas.
// sub es el id del usuario en la base de datos.
func (s *JWTService) GenerarToken(id int, email, rol string) (string, error) {
	if len(s.secret) == 0 {
		return "", errors.New("JWT_SECRET no está configurado")
	}

	claims := JWTClaims{
		Email: email,
		Rol:   rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(id),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "multicatalogo",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// ValidarToken verifica el token y devuelve los claims si es válido.
func (s *JWTService) ValidarToken(tokenString string) (*JWTClaims, error) {
	if len(s.secret) == 0 {
		return nil, errors.New("JWT_SECRET no está configurado")
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return s.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()})) // solo HS256: rechaza "none", HS384, RS256...

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token inválido")
}
