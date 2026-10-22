// src/context/cart.ts
// Tipos, contexto y hook del carrito (separados del Provider para Fast Refresh).
import { createContext, useContext } from "react";
import type { Producto } from "../data/productos";

// Elemento del carrito: un producto + la cantidad seleccionada
export interface CartItem extends Producto {
  cantidad: number;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto) => void;
  removeFromCart: (id: number) => void;
  incrementQuantity: (id: number) => void;
  decrementQuantity: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

// 3. Creamos el contexto indicando que puede ser CartContextType o undefined
export const CartContext = createContext<CartContextType | undefined>(undefined);

// 4. Hook personalizado con validación de tipo
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
};

