import { Product, StoreSettings, Order, Category } from '../types';

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'CARDAPP Gourmet',
  tagline: 'Cardápio Digital exclusivo com sabores selecionados e atendimento rápido',
  logoBase64: '', // CEO can upload custom logo in settings
  instagramHandle: '@cardappgourmet',
  phoneWhatsapp: '5584986113980',
  address: 'Av. Principal, 100 - Centro',
  isOpen: true,
  deliveryFee: 6.50,
  estimatedDeliveryTime: '30 - 45 min',
  pixKey: 'pix@cardapp.com.br',
  pixKeyType: 'email',
  minOrderValue: 20.00,
  serviceModes: {
    allowDelivery: true,
    allowRetirada: true,
    allowMesa: true,
  },
  paymentMethods: {
    allowPix: true,
    allowCreditCard: true,
    allowDebitCard: true,
    allowCash: true,
  },
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'todos', name: 'Todos os Itens' },
  { id: 'acai', name: 'Açaí & Sobremesas' },
  { id: 'burgers', name: 'Hambúrgueres Artesanais' },
  { id: 'pizzas', name: 'Pizzas Especiais' },
  { id: 'porcoes', name: 'Porções & Salgados' },
  { id: 'bebidas', name: 'Bebidas Geladas' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-acai-1',
    name: 'Açaí Puro da Amazônia 500ml',
    description: 'Açaí cremoso batido na consistência perfeita, sem cristais de gelo e sem xaropes artificiais.',
    price: 22.00,
    category: 'acai',
    isAvailable: true,
    promotion: {
      enabled: true,
      promoQuantity: 2,
      promoPrice: 38.00,
      description: 'Leve 2 por R$ 38,00',
    },
    complements: [
      { id: 'comp-1', name: 'Leite Condensado', price: 0 },
      { id: 'comp-2', name: 'Granola Crocante', price: 0 },
      { id: 'comp-3', name: 'Leite em Pó Ninho', price: 2.50 },
      { id: 'comp-4', name: 'Morangos Frescos Fatiados', price: 4.00 },
      { id: 'comp-5', name: 'Paçoca Artesanal', price: 2.00 },
      { id: 'comp-6', name: 'Nutella Pura', price: 5.00 },
    ],
  },
  {
    id: 'prod-burger-1',
    name: 'Smash Burger Duplo Bacon',
    description: 'Dois blends bovinos de 100g grelhados, queijo cheddar derretido, tiras de bacon crocante, cebola caramelizada e maionese no pão brioche.',
    price: 36.00,
    category: 'burgers',
    isAvailable: true,
    promotion: {
      enabled: true,
      promoQuantity: 2,
      promoPrice: 65.00,
      description: 'Combo Duplo: 2 burgers por R$ 65,00',
    },
    complements: [
      { id: 'comp-b1', name: 'Bacon Extra Crocante', price: 5.00 },
      { id: 'comp-b2', name: 'Queijo Cheddar Dobrado', price: 4.50 },
      { id: 'comp-b3', name: 'Maionese Especial Extra', price: 2.50 },
      { id: 'comp-b4', name: 'Picles Artesanal', price: 2.00 },
    ],
  },
  {
    id: 'prod-pizza-1',
    name: 'Pizza Napolitana Margherita',
    description: 'Massa artesanal de fermentação natural, molho de tomate pelado, muçarela de búfala fresca, folhas de manjericão e azeite extravirgem.',
    price: 52.00,
    category: 'pizzas',
    isAvailable: true,
    complements: [
      { id: 'comp-p1', name: 'Borda Recheada com Catupiry', price: 9.00 },
      { id: 'comp-p2', name: 'Borda Recheada com Cheddar', price: 9.00 },
      { id: 'comp-p3', name: 'Alho Frito Salpicado', price: 3.00 },
    ],
  },
  {
    id: 'prod-batata-1',
    name: 'Batata Rústica Crinkle com Ervas',
    description: 'Batatas rústicas com corte crinkle ultra sequinhas, temperadas com sal marinho e alecrim fresco, servidas com molho da casa.',
    price: 24.00,
    category: 'porcoes',
    isAvailable: true,
    promotion: {
      enabled: true,
      promoQuantity: 2,
      promoPrice: 40.00,
      description: 'Leve 2 por R$ 40,00',
    },
    complements: [
      { id: 'comp-f1', name: 'Cheddar Cremoso & Bacon Picado', price: 8.00 },
      { id: 'comp-f2', name: 'Maionese de Alho Negro Extra', price: 3.50 },
    ],
  },
  {
    id: 'prod-pastel-1',
    name: 'Coxinha Artesanal de Costela Desfiada (2 un)',
    description: 'Massa de mandioca levinha recheada com costela desfiada cozida lentamente por 12 horas.',
    price: 18.00,
    category: 'porcoes',
    isAvailable: true,
    promotion: {
      enabled: true,
      promoQuantity: 2,
      promoPrice: 32.00,
      description: '4 unidades por R$ 32,00',
    },
    complements: [
      { id: 'comp-c1', name: 'Molho de Pimenta Biquinho Defumada', price: 0 },
    ],
  },
  {
    id: 'prod-bebida-1',
    name: 'Soda Artesanal de Frutas Vermelhas 400ml',
    description: 'Elaborada com polpa pura de amoras e framboesas, suco de limão siciliano, água gaseificada e folhas de hortelã.',
    price: 14.00,
    category: 'bebidas',
    isAvailable: true,
    complements: [
      { id: 'comp-s1', name: 'Rodelas Extras de Limão e Gelo', price: 0 },
    ],
  },
];

// No mock customer data is pre-seeded, protecting customer privacy
export const INITIAL_ORDERS: Order[] = [];
