import { Product, StoreSettings, Order } from '../types';

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'CARDAPP Gourmet',
  tagline: 'Cardápio Digital exclusivo com sabores selecionados e atendimento rápido',
  logoBase64: '', // CEO can upload their custom logo
  instagramHandle: '@cardappgourmet',
  phoneWhatsapp: '5511998765432',
  address: 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
  isOpen: true,
  deliveryFee: 6.50,
  estimatedDeliveryTime: '30 - 45 min',
  pixKey: 'contato@cardappgourmet.com.br',
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

export const INITIAL_CATEGORIES = [
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

// Helper to format date YYYY-MM-DD
function getDateKey(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const todayKey = getDateKey(0);
const yesterdayKey = getDateKey(1);

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    displayId: '#CARD-1041',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    dateKey: todayKey,
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        quantity: 2,
        notes: 'Caprichar no leite condensado',
        selectedComplements: [
          { id: 'comp-1', name: 'Leite Condensado', price: 0 },
          { id: 'comp-4', name: 'Morangos Frescos Fatiados', price: 4.00 },
        ],
        appliedPromotion: {
          promoQuantity: 2,
          promoPrice: 38.00,
          savings: 6.00,
        },
        totalPrice: 42.00, // 38.00 promo + 4.00 morango
      },
      {
        product: INITIAL_PRODUCTS[1],
        quantity: 1,
        notes: 'Ponto da carne bem passada',
        selectedComplements: [
          { id: 'comp-b1', name: 'Bacon Extra Crocante', price: 5.00 },
        ],
        totalPrice: 41.00,
      },
    ],
    subtotal: 83.00,
    deliveryFee: 6.50,
    total: 89.50,
    customer: {
      name: 'Lucas Ferreira',
      phone: '(11) 98765-4321',
      deliveryType: 'delivery',
      address: {
        street: 'Rua Bela Cintra',
        number: '840',
        neighborhood: 'Consolação',
        complement: 'Apto 42B',
        city: 'São Paulo',
      },
      paymentMethod: 'pix',
    },
    status: 'em_rota',
    statusHistory: [
      { status: 'recebido', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), note: 'Pedido registrado' },
      { status: 'em_producao', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), note: 'Cozinha montando os itens' },
      { status: 'em_rota', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), note: 'Entregador em rota de entrega' },
    ],
  },
  {
    id: 'ord-102',
    displayId: '#CARD-1042',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    dateKey: todayKey,
    items: [
      {
        product: INITIAL_PRODUCTS[2],
        quantity: 1,
        notes: '',
        selectedComplements: [
          { id: 'comp-p1', name: 'Borda Recheada com Catupiry', price: 9.00 },
        ],
        totalPrice: 61.00,
      },
    ],
    subtotal: 61.00,
    deliveryFee: 0,
    total: 61.00,
    customer: {
      name: 'Mariana Lima',
      phone: '(11) 97123-9988',
      deliveryType: 'retirada',
      paymentMethod: 'dinheiro',
      cashGiven: 100.00,
      changeToReturn: 39.00,
    },
    status: 'em_producao',
    statusHistory: [
      { status: 'recebido', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), note: 'Pedido recebido no balcão' },
      { status: 'em_producao', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), note: 'Forno aquecido' },
    ],
  },
  {
    id: 'ord-099',
    displayId: '#CARD-1039',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    dateKey: yesterdayKey,
    items: [
      {
        product: INITIAL_PRODUCTS[1],
        quantity: 2,
        appliedPromotion: {
          promoQuantity: 2,
          promoPrice: 65.00,
          savings: 7.00,
        },
        totalPrice: 65.00,
      },
      {
        product: INITIAL_PRODUCTS[5],
        quantity: 2,
        totalPrice: 28.00,
      },
    ],
    subtotal: 93.00,
    deliveryFee: 6.50,
    total: 99.50,
    customer: {
      name: 'Rodrigo Alves',
      phone: '(11) 96543-2109',
      deliveryType: 'delivery',
      address: {
        street: 'Alameda Santos',
        number: '1450',
        neighborhood: 'Cerqueira César',
        city: 'São Paulo',
      },
      paymentMethod: 'cartao_credito',
    },
    status: 'finalizado',
    statusHistory: [
      { status: 'recebido', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), note: 'Pedido registrado' },
      { status: 'em_producao', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25.5).toISOString(), note: 'Em preparo' },
      { status: 'em_rota', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), note: 'Em rota' },
      { status: 'finalizado', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24.5).toISOString(), note: 'Entregue com sucesso' },
    ],
  },
];
