import { Product, Order, StoreSettings, OrderStatus, Category } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_CATEGORIES } from '../data/initialData';

const PRODUCTS_KEY = 'cardapp_products_v2';
const ORDERS_KEY = 'cardapp_orders_v2';
const SETTINGS_KEY = 'cardapp_settings_v2';
const CATEGORIES_KEY = 'cardapp_categories_v2';
const ACTIVE_ORDER_ID_KEY = 'cardapp_active_order_id_v2';

export const storageService = {
  getCategories(): Category[] {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  },

  saveCategories(categories: Category[]) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    this.notifyChange('categories');
  },

  addCategory(name: string): Category {
    const categories = this.getCategories();
    const id = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 20) + '_' + Date.now().toString().slice(-4);

    const newCat: Category = { id, name };
    const updated = [...categories, newCat];
    this.saveCategories(updated);
    return newCat;
  },

  deleteCategory(categoryId: string) {
    const categories = this.getCategories();
    const updated = categories.filter((c) => c.id !== categoryId);
    this.saveCategories(updated);
  },

  getProducts(): Product[] {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  },

  saveProducts(products: Product[]) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    this.notifyChange('products');
  },

  addProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now(),
    };
    const updated = [newProduct, ...products];
    this.saveProducts(updated);
    return newProduct;
  },

  updateProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
      this.saveProducts(products);
    }
  },

  deleteProduct(productId: string) {
    const products = this.getProducts();
    const updated = products.filter((p) => p.id !== productId);
    this.saveProducts(updated);
  },

  getOrders(): Order[] {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  },

  saveOrders(orders: Order[]) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    this.notifyChange('orders');
  },

  createOrder(orderData: Omit<Order, 'id' | 'displayId' | 'createdAt' | 'dateKey' | 'status' | 'statusHistory'>): Order {
    const orders = this.getOrders();
    const nextSeq = 1040 + orders.length + 1;
    const nowIso = new Date().toISOString();
    const dateKey = nowIso.split('T')[0];

    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      displayId: `#CARD-${nextSeq}`,
      createdAt: nowIso,
      dateKey,
      status: 'recebido',
      statusHistory: [
        {
          status: 'recebido',
          timestamp: nowIso,
          note: 'Pedido recebido com sucesso no sistema da loja!',
        },
      ],
    };

    const updated = [newOrder, ...orders];
    this.saveOrders(updated);
    this.setActiveOrderId(newOrder.id);
    this.playNotificationSound();
    return newOrder;
  },

  updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string): Order | null {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    const order = orders[index];
    const defaultNotes: Record<OrderStatus, string> = {
      recebido: 'Pedido registrado e conferido pelo estabelecimento.',
      em_producao: 'Cozinha iniciou o preparo dos itens do seu pedido.',
      em_rota: order.customer.deliveryType === 'delivery' 
        ? 'Pedido embalado e entregador a caminho do seu endereço!' 
        : 'Pedido pronto e disponível para retirada no balcão.',
      finalizado: 'Pedido entregue com sucesso! Bom apetite.',
    };

    const updatedHistory = [
      ...order.statusHistory,
      {
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: note || defaultNotes[newStatus],
      },
    ];

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      statusHistory: updatedHistory,
    };

    orders[index] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  deleteOrder(orderId: string) {
    const orders = this.getOrders();
    const updated = orders.filter((o) => o.id !== orderId);
    this.saveOrders(updated);
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
  },

  getOrderById(orderId: string): Order | undefined {
    const orders = this.getOrders();
    return orders.find((o) => o.id === orderId);
  },

  getSettings(): StoreSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          serviceModes: {
            ...INITIAL_SETTINGS.serviceModes,
            ...(parsed.serviceModes || {}),
          },
          paymentMethods: {
            ...INITIAL_SETTINGS.paymentMethods,
            ...(parsed.paymentMethods || {}),
          },
        };
      }
    } catch {
      // fallback
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    this.notifyChange('settings');
  },

  getActiveOrderId(): string | null {
    return localStorage.getItem(ACTIVE_ORDER_ID_KEY);
  },

  setActiveOrderId(orderId: string | null) {
    if (orderId) {
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
    } else {
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
    }
    this.notifyChange('activeOrder');
  },

  notifyChange(target: string) {
    window.dispatchEvent(new CustomEvent('cardapp_update', { detail: { target } }));
  },

  subscribe(callback: (target: string) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      callback(customEvent.detail?.target || 'all');
    };
    window.addEventListener('cardapp_update', handler);
    window.addEventListener('storage', () => callback('storage'));
    return () => {
      window.removeEventListener('cardapp_update', handler);
      window.removeEventListener('storage', () => callback('storage'));
    };
  },

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Ignore if user hasn't interacted with audio context yet
    }
  },
};
