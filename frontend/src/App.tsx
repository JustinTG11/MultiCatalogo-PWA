// src/App.tsx
import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Catalogo from './components/Catalogo';
import Storefront from './components/Storefront';
import DetalleProducto from './components/DetalleProducto';
import MiRed from './components/MiRed';
import Carrito from './components/Carrito';
import Checkout from './components/Checkout';
import Confirmacion from './components/Confirmacion';
import Login from './components/Login';
import Registro from './components/Registro';
import AdminProductos from './components/AdminProductos';
import MisPedidos from './components/MisPedidos';
import AdminPedidos from './components/AdminPedidos';
import AdminLiquidaciones from './components/AdminLiquidaciones';
import AdminUsuarios from './components/AdminUsuarios';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/auth';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const AdminRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.rol !== 'admin') {
    return <Navigate to="/tienda" replace />;
  }
  return <Outlet />;
};

const CartBoundary = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return (
    <CartProvider key={user?.email ?? "anonimo"}>
      {children}
    </CartProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Layout />}>
                    <Route element={<AdminRoute />}>
                      <Route index element={<Dashboard />} />
                      <Route path="admin/pedidos" element={<AdminPedidos />} />
                      <Route path="admin/liquidaciones" element={<AdminLiquidaciones />} />
                      <Route path="admin/productos" element={<AdminProductos />} />
                      <Route path="admin/usuarios" element={<AdminUsuarios />} />
                    </Route>

                    <Route path="mi-red" element={<MiRed />} />
                    <Route path="mis-pedidos" element={<MisPedidos />} />
                    <Route path="tienda" element={<Storefront />} />
                    <Route path="catalogo" element={<Catalogo />} />
                    <Route path="producto/:id" element={<DetalleProducto />} />
                    <Route path="carrito" element={<Carrito />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="confirmacion" element={<Confirmacion />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CartBoundary>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
