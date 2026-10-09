import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Order, StoreSettings, OrderStatus, Category } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
} from '../data/initialData';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('cardapp_orders_realtime_sync');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'ORDER_CREATED' || event.data?.type === 'DATA_UPDATED') {
        storageService.notifyChange();
      }
    };
  }
} catch {
  // ignore
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('cardapp_')) {
      storageService.notifyChange();
    }
  });
}

const ACTIVE_ORDER_ID_KEY = 'cardapp_active_order_id_v3';

export const storageService = {
  currentStoreId: 'default_store',
  listeners: [] as (() => void)[],
  unsubscribers: [] as Unsubscribe[],

  getProductsKey(): string {
    return `cardapp_products_${this.currentStoreId}`;
  },
  getOrdersKey(): string {
    return `cardapp_orders_${this.currentStoreId}`;
  },
  getSettingsKey(): string {
    return `cardapp_settings_${this.currentStoreId}`;
  },
  getCategoriesKey(): string {
    return `cardapp_categories_${this.currentStoreId}`;
  },

  setStoreId(storeId: string, initialStoreName?: string, initialPhone?: string) {
    const cleanId = storeId || 'default_store';
    const changed = this.currentStoreId !== cleanId;
    this.currentStoreId = cleanId;

    if (cleanId !== 'default_store' && cleanId !== 'master_admin') {
      const prodKey = this.getProductsKey();
      if (localStorage.getItem(prodKey) === null) {
        localStorage.setItem(prodKey, JSON.stringify([]));
      }
      const ordKey = this.getOrdersKey();
      if (localStorage.getItem(ordKey) === null) {
        localStorage.setItem(ordKey, JSON.stringify([]));
      }
      const catKey = this.getCategoriesKey();
      if (localStorage.getItem(catKey) === null) {
        localStorage.setItem(catKey, JSON.stringify([{ id: 'todos', name: 'Todos os Itens' }]));
      }
      const setKey = this.getSettingsKey();
      if (localStorage.getItem(setKey) === null) {
        const freshSettings: StoreSettings = {
          ...INITIAL_SETTINGS,
          storeName: initialStoreName || 'Minha Loja',
          phoneWhatsapp: initialPhone || '5584986113980',
          logoBase64: '',
          tagline: 'Cardápio Digital exclusivo com atendimento rápido e prático',
          instagramHandle: '',
          address: '',
          pixKey: '',
          deliveryNeighborhoods: [],
          isOpen: true,
        };
        localStorage.setItem(setKey, JSON.stringify(freshSettings));
      }
    }

    if (changed) {
      this.initFirestoreSync();
      this.notifyChange();
    }
  },

  initializeNewStore(storeId: string, storeName: string, phoneWhatsapp?: string): StoreSettings {
    const cleanId = storeId || `store_${Date.now()}`;
    const prodKey = `cardapp_products_${cleanId}`;
    const ordKey = `cardapp_orders_${cleanId}`;
    const catKey = `cardapp_categories_${cleanId}`;
    const setKey = `cardapp_settings_${cleanId}`;

    const freshSettings: StoreSettings = {
      ...INITIAL_SETTINGS,
      storeName: storeName || 'Minha Loja',
      phoneWhatsapp: phoneWhatsapp || '5584986113980',
      logoBase64: '',
      tagline: 'Cardápio Digital exclusivo com atendimento rápido e prático',
      instagramHandle: '',
      address: '',
      pixKey: '',
      deliveryNeighborhoods: [],
      isOpen: true,
    };

    localStorage.setItem(prodKey, JSON.stringify([]));
    localStorage.setItem(ordKey, JSON.stringify([]));
    localStorage.setItem(catKey, JSON.stringify([{ id: 'todos', name: 'Todos os Itens' }]));
    localStorage.setItem(setKey, JSON.stringify(freshSettings));

    try {
      const setRef = doc(db, 'stores', cleanId, 'settings', 'current');
      setDoc(setRef, freshSettings).catch(() => {});
    } catch {
      // ignore
    }

    return freshSettings;
  },

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notifyChange() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // ignore listener errors
      }
    });
  },

  // Initialize Firestore listeners for live real-time sync across devices
  initFirestoreSync() {
    this.unsubscribers.forEach((u) => {
      try {
        u();
      } catch {
        // ignore
      }
    });
    this.unsubscribers = [];

    const targetStore = this.currentStoreId;

    try {
      // Live sync for Settings
      const settingsRef = doc(db, 'stores', targetStore, 'settings', 'current');
      const unsubSettings = onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as StoreSettings;
            localStorage.setItem(this.getSettingsKey(), JSON.stringify(data));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore settings listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubSettings);

      // Live sync for Orders
      const ordersRef = collection(db, 'stores', targetStore, 'orders');
      const unsubOrders = onSnapshot(
        ordersRef,
        (snap) => {
          if (!snap.empty) {
            const orders: Order[] = [];
            snap.forEach((d) => {
              orders.push(d.data() as Order);
            });
            // Sort newest first
            orders.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem(this.getOrdersKey(), JSON.stringify(orders));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore orders listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubOrders);

      // Live sync for Products
      const productsRef = collection(db, 'stores', targetStore, 'products');
      const unsubProducts = onSnapshot(
        productsRef,
        (snap) => {
          if (!snap.empty) {
            const products: Product[] = [];
            snap.forEach((d) => {
              products.push(d.data() as Product);
            });
            localStorage.setItem(this.getProductsKey(), JSON.stringify(products));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore products listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubProducts);

      // Live sync for Categories
      const categoriesRef = collection(db, 'stores', targetStore, 'categories');
      const unsubCats = onSnapshot(
        categoriesRef,
        (snap) => {
          if (!snap.empty) {
            const categories: Category[] = [];
            snap.forEach((d) => {
              categories.push(d.data() as Category);
            });
            localStorage.setItem(this.getCategoriesKey(), JSON.stringify(categories));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore categories listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubCats);
    } catch (e) {
      console.warn('Erro ao inicializar listeners do Firestore:', e);
    }
  },

  // CATEGORIES
  getCategories(): Category[] {
    try {
      const stored = localStorage.getItem(this.getCategoriesKey());
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    if (this.currentStoreId !== 'default_store' && this.currentStoreId !== 'master_admin') {
      const cleanCats: Category[] = [{ id: 'todos', name: 'Todos os Itens' }];
      localStorage.setItem(this.getCategoriesKey(), JSON.stringify(cleanCats));
      return cleanCats;
    }
    localStorage.setItem(this.getCategoriesKey(), JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  },

  saveCategories(categories: Category[]) {
    localStorage.setItem(this.getCategoriesKey(), JSON.stringify(categories));
    this.notifyChange();

    // Sync to Firestore
    try {
      categories.forEach(async (cat) => {
        const catRef = doc(db, 'stores', this.currentStoreId, 'categories', cat.id);
        await setDoc(catRef, cat).catch(() => {});
      });
    } catch {
      // ignore
    }
  },

  addCategory(name: string): Category {
    const categories = this.getCategories();
    const id =
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 20) +
      '_' +
      Date.now().toString().slice(-4);

    const newCat: Category = { id, name };
    const updated = [...categories, newCat];
    this.saveCategories(updated);

    // Save to Firestore directly
    try {
      const catRef = doc(db, 'stores', this.currentStoreId, 'categories', id);
      setDoc(catRef, newCat).catch((err) => {
        console.warn('Sync addCategory fallback:', err);
      });
    } catch {
      // ignore
    }

    return newCat;
  },

  deleteCategory(categoryId: string) {
    const categories = this.getCategories();
    const updated = categories.filter((c) => c.id !== categoryId);
    this.saveCategories(updated);

    // Delete in Firestore
    try {
      const catRef = doc(db, 'stores', this.currentStoreId, 'categories', categoryId);
      deleteDoc(catRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  // PRODUCTS
  getProducts(): Product[] {
    try {
      const stored = localStorage.getItem(this.getProductsKey());
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // fallback
    }
    if (this.currentStoreId === 'default_store' || this.currentStoreId === 'master_admin') {
      localStorage.setItem(this.getProductsKey(), JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    // Para contas novas de clientes/lojistas: começa 100% zerado
    localStorage.setItem(this.getProductsKey(), JSON.stringify([]));
    return [];
  },

  saveProducts(products: Product[]) {
    localStorage.setItem(this.getProductsKey(), JSON.stringify(products));
    this.notifyChange();

    // Sync to Firestore
    try {
      products.forEach(async (prod) => {
        const prodRef = doc(db, 'stores', this.currentStoreId, 'products', prod.id);
        await setDoc(prodRef, prod).catch(() => {});
      });
    } catch {
      // ignore
    }
  },

  addProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now(),
    };
    const updated = [newProduct, ...products];
    this.saveProducts(updated);

    // Sync to Firestore
    try {
      const prodRef = doc(db, 'stores', this.currentStoreId, 'products', newProduct.id);
      setDoc(prodRef, newProduct).catch((err) => {
        console.warn('Sync addProduct fallback:', err);
      });
    } catch {
      // ignore
    }

    return newProduct;
  },

  updateProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
      this.saveProducts(products);

      // Sync to Firestore
      try {
        const prodRef = doc(db, 'stores', this.currentStoreId, 'products', product.id);
        setDoc(prodRef, product).catch((err) => {
          console.warn('Sync updateProduct fallback:', err);
        });
      } catch {
        // ignore
      }
    }
  },

  deleteProduct(productId: string) {
    const products = this.getProducts();
    const updated = products.filter((p) => p.id !== productId);
    this.saveProducts(updated);

    // Sync to Firestore
    try {
      const prodRef = doc(db, 'stores', this.currentStoreId, 'products', productId);
      deleteDoc(prodRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  // ORDERS
  getOrders(): Order[] {
    try {
      const stored = localStorage.getItem(this.getOrdersKey());
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    if (this.currentStoreId === 'default_store' || this.currentStoreId === 'master_admin') {
      localStorage.setItem(this.getOrdersKey(), JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    // Para contas novas de clientes/lojistas: começa 100% zerado
    localStorage.setItem(this.getOrdersKey(), JSON.stringify([]));
    return [];
  },

  saveOrders(orders: Order[]) {
    localStorage.setItem(this.getOrdersKey(), JSON.stringify(orders));
    this.notifyChange();
  },

  createOrder(
    orderData: Omit<
      Order,
      'id' | 'displayId' | 'createdAt' | 'dateKey' | 'status' | 'statusHistory'
    >
  ): Order {
    const orders = this.getOrders();
    const nowIso = new Date().toISOString();
    const dateKey = nowIso.split('T')[0];

    // Gera número do pedido sempre com 5 dígitos (iniciando em 63126 como na comanda)
    let fiveDigitNumber = 63126;
    if (orders.length > 0) {
      const highestNum = orders.reduce((max, o) => {
        const clean = o.displayId.replace(/\D/g, '');
        const val = parseInt(clean, 10);
        return !isNaN(val) && val >= 10000 && val <= 99999 ? Math.max(max, val) : max;
      }, 63125);
      fiveDigitNumber = highestNum + 1;
      if (fiveDigitNumber > 99999) fiveDigitNumber = 10001;
    }
    const displayId = String(fiveDigitNumber);

    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      displayId,
      createdAt: nowIso,
      dateKey,
      status: 'recebido',
      statusHistory: [
        {
          status: 'recebido',
          timestamp: nowIso,
          note: 'Pedido recebido com sucesso',
        },
      ],
    };

    const updated = [newOrder, ...orders];
    this.saveOrders(updated);
    this.setActiveOrderId(newOrder.id);

    // Notifica instantaneamente qualquer aba aberta (ex: tela do CEO)
    try {
      broadcastChannel?.postMessage({
        type: 'ORDER_CREATED',
        storeId: this.currentStoreId,
        orderId: newOrder.id,
      });
    } catch {
      // ignore
    }

    // Sync to Firestore
    try {
      const orderRef = doc(db, 'stores', this.currentStoreId, 'orders', newOrder.id);
      setDoc(orderRef, newOrder).catch((err) => {
        console.warn('Sync createOrder fallback:', err);
      });
    } catch {
      // ignore
    }

    return newOrder;
  },

  updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string) {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      const current = orders[index];
      const nowIso = new Date().toISOString();
      const updatedHistory = [
        ...current.statusHistory,
        {
          status: newStatus,
          timestamp: nowIso,
          note: note || `Status alterado para ${newStatus}`,
        },
      ];

      const updatedOrder: Order = {
        ...current,
        status: newStatus,
        statusHistory: updatedHistory,
      };

      orders[index] = updatedOrder;
      this.saveOrders(orders);

      try {
        broadcastChannel?.postMessage({
          type: 'DATA_UPDATED',
          storeId: this.currentStoreId,
          orderId,
        });
      } catch {
        // ignore
      }

      // Sync to Firestore
      try {
        const orderRef = doc(db, 'stores', this.currentStoreId, 'orders', orderId);
        setDoc(orderRef, updatedOrder).catch((err) => {
          console.warn('Sync updateOrderStatus fallback:', err);
        });
      } catch {
        // ignore
      }
    }
  },

  deleteOrder(orderId: string): boolean {
    const orders = this.getOrders();
    const updated = orders.filter((o) => o.id !== orderId);
    this.saveOrders(updated);

    if (this.getActiveOrderId() === orderId) {
      this.clearActiveOrderId();
    }

    try {
      broadcastChannel?.postMessage({
        type: 'DATA_UPDATED',
        storeId: this.currentStoreId,
      });
    } catch {
      // ignore
    }

    // Sync delete to Firestore
    try {
      const orderRef = doc(db, 'stores', this.currentStoreId, 'orders', orderId);
      deleteDoc(orderRef).catch(() => {});
    } catch {
      // ignore
    }

    return true;
  },

  getActiveOrderId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    } catch {
      return null;
    }
  },

  setActiveOrderId(id: string) {
    try {
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, id);
      this.notifyChange();
    } catch {
      // ignore
    }
  },

  clearActiveOrderId() {
    try {
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
      this.notifyChange();
    } catch {
      // ignore
    }
  },

  // STORE SETTINGS
  getSettings(): StoreSettings {
    try {
      const stored = localStorage.getItem(this.getSettingsKey());
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    if (this.currentStoreId !== 'default_store' && this.currentStoreId !== 'master_admin') {
      const freshSettings: StoreSettings = {
        ...INITIAL_SETTINGS,
        storeName: 'Minha Loja',
        phoneWhatsapp: '5584986113980',
        logoBase64: '',
        tagline: 'Cardápio Digital exclusivo com atendimento rápido e prático',
        instagramHandle: '',
        address: '',
        pixKey: '',
        deliveryNeighborhoods: [],
        isOpen: true,
      };
      localStorage.setItem(this.getSettingsKey(), JSON.stringify(freshSettings));
      return freshSettings;
    }
    localStorage.setItem(this.getSettingsKey(), JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    localStorage.setItem(this.getSettingsKey(), JSON.stringify(settings));
    this.notifyChange();

    try {
      broadcastChannel?.postMessage({
        type: 'DATA_UPDATED',
        storeId: this.currentStoreId,
      });
    } catch {
      // ignore
    }

    // Sync to Firestore
    try {
      const settingsRef = doc(db, 'stores', this.currentStoreId, 'settings', 'current');
      setDoc(settingsRef, settings).catch((err) => {
        console.warn('Sync saveSettings fallback:', err);
      });
    } catch {
      // ignore
    }
  },
};

// Start sync immediately
storageService.initFirestoreSync();
