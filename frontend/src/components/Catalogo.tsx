// src/components/Catalogo.tsx — Catálogo renovado: filtros, orden, skeletons, dark mode
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "../context/cart";
import { useToast } from "../context/ToastContext";
import { getProductos } from "../services/productosService";
import { categorias, type Producto } from "../data/productos";

type Orden = "nombre" | "precio-asc" | "precio-desc";

const SkeletonCard = () => (
  <div className="card overflow-hidden flex flex-col">
    <div className="skeleton h-44 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-10 w-full mt-2" />
    </div>
  </div>
);

const Catalogo = () => {
  const { addToCart } = useCart();
  const { success } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState(searchParams.get("categoria") ?? "Todas");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [vista, setVista] = useState<"grid" | "lista">("grid");

  useEffect(() => {
    getProductos()
      .then((data) => setProductos(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = productos.filter((prod) => {
      const coincideCategoria = categoria === "Todas" || prod.categoria === categoria;
      const coincideTexto =
        texto === "" ||
        prod.nombre.toLowerCase().includes(texto) ||
        prod.descripcion.toLowerCase().includes(texto);
      return coincideCategoria && coincideTexto;
    });

    lista = [...lista].sort((a, b) => {
      if (orden === "precio-asc") return a.precio - b.precio;
      if (orden === "precio-desc") return b.precio - a.precio;
      return a.nombre.localeCompare(b.nombre, "es");
    });
    return lista;
  }, [productos, busqueda, categoria, orden]);

  const handleCategoriaChange = (value: string) => {
    setCategoria(value);
    if (value === "Todas") setSearchParams({});
    else setSearchParams({ categoria: value });
  };

  const handleAdd = (prod: Producto) => {
    addToCart(prod);
    success(`"${prod.nombre}" agregado al carrito`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">Catálogo de Productos</h1>
        <p className="page-subtitle mt-1">
          {loading
            ? "Cargando productos..."
            : `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? "s" : ""} encontrado${productosFiltrados.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filtros */}
      <div className="card p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="input-field pl-10"
            />
          </div>

          <select
            value={categoria}
            onChange={(e) => handleCategoriaChange(e.target.value)}
            className="input-field lg:w-48"
          >
            <option value="Todas">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="input-field lg:w-44"
          >
            <option value="nombre">Nombre A-Z</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>

          <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setVista("grid")}
              className={`px-3 min-h-[44px] ${vista === "grid" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
              title="Vista grilla"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setVista("lista")}
              className={`px-3 min-h-[44px] ${vista === "lista" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
              title="Vista lista"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-2">
          {["Todas", ...categorias].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoriaChange(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                categoria === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">No hay productos que coincidan</p>
          <p className="text-sm text-slate-400 mb-4">Prueba con otros filtros o limpia la búsqueda</p>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setCategoria("Todas");
              setSearchParams({});
            }}
            className="btn-primary"
          >
            Limpiar filtros
          </button>
        </div>
      ) : vista === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {productosFiltrados.map((prod) => (
            <article
              key={prod.id}
              className="card overflow-hidden flex flex-col group hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition duration-200"
            >
              <Link to={`/producto/${prod.id}`} className="relative block overflow-hidden">
                <img
                  src={prod.img}
                  alt={prod.nombre}
                  className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
                  {prod.categoria}
                </span>
              </Link>
              <div className="p-4 flex flex-col flex-1">
                <Link to={`/producto/${prod.id}`}>
                  <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1">
                    {prod.nombre}
                  </h3>
                </Link>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 flex-1">
                  {prod.descripcion}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    ${prod.precio.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdd(prod)}
                    className="btn-primary !min-h-[40px] !px-3 !py-2 text-sm"
                  >
                    + Carrito
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {productosFiltrados.map((prod) => (
            <article
              key={prod.id}
              className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition"
            >
              <Link to={`/producto/${prod.id}`} className="shrink-0">
                <img
                  src={prod.img}
                  alt={prod.nombre}
                  className="w-full sm:w-28 h-36 sm:h-28 object-cover rounded-xl"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{prod.categoria}</span>
                  <Link to={`/producto/${prod.id}`}>
                    <h3 className="font-semibold text-slate-800 dark:text-white hover:text-indigo-600 transition truncate">
                      {prod.nombre}
                    </h3>
                  </Link>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{prod.descripcion}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">${prod.precio.toFixed(2)}</span>
                  <button type="button" onClick={() => handleAdd(prod)} className="btn-primary !min-h-[40px] text-sm">
                    + Carrito
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalogo;
