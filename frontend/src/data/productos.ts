// src/data/productos.ts
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  galeria: string[];
}

export const categorias = [
  "Serum",
  "Crema",
  "Tónico",
  "Mascarilla",
  "Kit",
  "Limpieza",
  "Protector solar",
];

const g = (seed: string) => [
  `https://picsum.photos/seed/${seed}1/600`,
  `https://picsum.photos/seed/${seed}2/600`,
  `https://picsum.photos/seed/${seed}3/600`,
];

export const productosMock: Producto[] = [
  {
    id: 1,
    nombre: "Serum Revitalizante",
    descripcion:
      "Serum concentrado con vitamina C y ácido hialurónico. Ilumina la piel, reduce manchas y aporta hidratación profunda desde la primera aplicación.",
    precio: 45.0,
    categoria: "Serum",
    img: "https://picsum.photos/seed/serum/600",
    galeria: g("serum"),
  },
  {
    id: 2,
    nombre: "Crema Hidratante Pro",
    descripcion:
      "Crema facial de textura ligera con niacinamida y manteca de karité. Hidratación de 24 horas y barrera cutánea fortalecida para todo tipo de piel.",
    precio: 32.5,
    categoria: "Crema",
    img: "https://picsum.photos/seed/crema/600",
    galeria: g("crema"),
  },
  {
    id: 3,
    nombre: "Tónico Purificante",
    descripcion:
      "Tónico sin alcohol con hamamelis y agua de rosas. Limpia poros, equilibra el pH y prepara la piel para el resto de la rutina diaria.",
    precio: 28.0,
    categoria: "Tónico",
    img: "https://picsum.photos/seed/tonico/600",
    galeria: g("tonico"),
  },
  {
    id: 4,
    nombre: "Mascarilla Nocturna",
    descripcion:
      "Mascarilla de noche con colágeno y vitamina E. Repara la piel mientras duermes y recupera la luminosidad al despertar.",
    precio: 50.0,
    categoria: "Mascarilla",
    img: "https://picsum.photos/seed/mascarilla/600",
    galeria: g("mascarilla"),
  },
  {
    id: 5,
    nombre: "Serum Anti-Edad Retinol",
    descripcion:
      "Serum de retinol encapsulado que suaviza líneas de expresión y mejora la firmeza. Uso nocturno recomendado.",
    precio: 58.0,
    categoria: "Serum",
    img: "https://picsum.photos/seed/retinol/600",
    galeria: g("retinol"),
  },
  {
    id: 6,
    nombre: "Crema Contorno de Ojos",
    descripcion:
      "Contorno de ojos con cafeína y péptidos. Reduce bolsas y ojeras, hidrata la zona más delicada del rostro.",
    precio: 26.0,
    categoria: "Crema",
    img: "https://picsum.photos/seed/ojos/600",
    galeria: g("ojos"),
  },
  {
    id: 7,
    nombre: "Tónico Exfoliante AHA-BHA",
    descripcion:
      "Exfoliación química suave con ácidos AHA y BHA. Renueva la textura de la piel y desobstruye los poros.",
    precio: 34.0,
    categoria: "Tónico",
    img: "https://picsum.photos/seed/exfoliante/600",
    galeria: g("exfoliante"),
  },
  {
    id: 8,
    nombre: "Kit Rutina Completa",
    descripcion:
      "Kit integral con serum, crema, tónico y mascarilla. La rutina perfecta para comenzar: limpieza, tratamiento e hidratación.",
    precio: 129.0,
    categoria: "Kit",
    img: "https://picsum.photos/seed/kit/600",
    galeria: g("kit"),
  },
  // ——— Nuevos productos ———
  {
    id: 9,
    nombre: "Gel Limpiador Suave",
    descripcion:
      "Limpiador facial sin sulfatos con extracto de aloe. Elimina impurezas sin resecar y deja la piel fresca y equilibrada.",
    precio: 22.0,
    categoria: "Limpieza",
    img: "https://picsum.photos/seed/limpiador/600",
    galeria: g("limpiador"),
  },
  {
    id: 10,
    nombre: "Agua Micelar 3 en 1",
    descripcion:
      "Desmaquilla, limpia y tonifica en un solo paso. Ideal para piel sensible. Sin alcohol ni fragancias irritantes.",
    precio: 18.5,
    categoria: "Limpieza",
    img: "https://picsum.photos/seed/micelar/600",
    galeria: g("micelar"),
  },
  {
    id: 11,
    nombre: "Protector Solar FPS 50",
    descripcion:
      "Protección UVA/UVB de amplio espectro, textura ultraligera y acabado invisible. Resistente al agua 80 minutos.",
    precio: 36.0,
    categoria: "Protector solar",
    img: "https://picsum.photos/seed/solar/600",
    galeria: g("solar"),
  },
  {
    id: 12,
    nombre: "Serum Niacinamida 10%",
    descripcion:
      "Controla el sebo, minimiza poros y unifica el tono. Fórmula ligera de rápida absorción para uso diario.",
    precio: 39.0,
    categoria: "Serum",
    img: "https://picsum.photos/seed/niacinamida/600",
    galeria: g("niacinamida"),
  },
  {
    id: 13,
    nombre: "Crema Reparadora Ceramida",
    descripcion:
      "Restaura la barrera cutánea con ceramidas y colesterol. Ideal post-tratamiento o pieles reactivas.",
    precio: 42.0,
    categoria: "Crema",
    img: "https://picsum.photos/seed/ceramida/600",
    galeria: g("ceramida"),
  },
  {
    id: 14,
    nombre: "Mascarilla de Arcilla Verde",
    descripcion:
      "Purifica y matifica. Absorbe el exceso de grasa y deja la piel limpia y suave. Uso 1–2 veces por semana.",
    precio: 24.0,
    categoria: "Mascarilla",
    img: "https://picsum.photos/seed/arcilla/600",
    galeria: g("arcilla"),
  },
  {
    id: 15,
    nombre: "Kit Viaje Esenciales",
    descripcion:
      "Tamaños travel de limpiador, serum y crema. Perfecto para llevar tu rutina a cualquier destino.",
    precio: 49.0,
    categoria: "Kit",
    img: "https://picsum.photos/seed/viaje/600",
    galeria: g("viaje"),
  },
  {
    id: 16,
    nombre: "Bálsamo Labial SPF 15",
    descripcion:
      "Hidratación intensa con manteca de karité y protección solar ligera. Textura no grasa, uso diario.",
    precio: 12.0,
    categoria: "Protector solar",
    img: "https://picsum.photos/seed/labial/600",
    galeria: g("labial"),
  },
];
