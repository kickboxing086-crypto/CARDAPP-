export interface FontOption {
  id: string;
  name: string;
  category: string;
  tag: string;
  className: string;
  sampleText: string;
}

export const ELEGANT_FONTS: FontOption[] = [
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    category: 'Moderna & Clean',
    tag: 'Padrão',
    className: 'font-jakarta',
    sampleText: 'Sabor Autêntico e Contemporâneo',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    category: 'Elegante & Luxo',
    tag: 'Luxo',
    className: 'font-playfair',
    sampleText: 'Gastronomia Nobre & Selecionada',
  },
  {
    id: 'cinzel',
    name: 'Cinzel Imperial',
    category: 'Clássica & Nobre',
    tag: 'Premium',
    className: 'font-cinzel',
    sampleText: 'Cardápio Tradicional de Excelência',
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    category: 'Bistrô Fino & Sofisticada',
    tag: 'Bistrô',
    className: 'font-cormorant',
    sampleText: 'Culinária Artesanal & Requintada',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'Urbana & Encorpada',
    tag: 'Forte',
    className: 'font-montserrat',
    sampleText: 'Hambúrgueres & Sabores Intensos',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    category: 'Geométrica & Amigável',
    tag: 'Suave',
    className: 'font-poppins',
    sampleText: 'Açaí, Sobremesas & Delícias',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'Minimalista & Fluida',
    tag: 'Clean',
    className: 'font-outfit',
    sampleText: 'Experiência Rápida e Perfeita',
  },
  {
    id: 'syne',
    name: 'Syne Artística',
    category: 'Vanguardista & Marcante',
    tag: 'Artística',
    className: 'font-syne',
    sampleText: 'Pizzas Especiais & Estilo Único',
  },
];

export function getFontClass(fontId?: string): string {
  const found = ELEGANT_FONTS.find((f) => f.id === fontId);
  return found ? found.className : 'font-jakarta';
}
