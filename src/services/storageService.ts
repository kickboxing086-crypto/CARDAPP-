import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, Order, StoreSettings, OrderStatus, Category } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
} from '../data/initialData';

const STORE_ID = 'default_store';

const PRODUCTS_KEY = 'cardapp_products_v3';
const ORDERS_KEY = 'cardapp_orders_v3';
const SETTINGS_KEY = 'cardapp_settings_v3';
const CATEGORIES_KEY = 'cardapp_categories_v3';
const ACTIVE_ORDER_ID_KEY = 'cardapp_active_order_id_v3';

export const storageService = {
  listeners: [] as (() => void)[],

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
    try {
      // Live sync for Settings
      const settingsRef = doc(db, 'stores', STORE_ID, 'settings', 'current');
      onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as StoreSettings;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore settings listener offline/fallback:', error);
        }
      );

      // Live sync for Orders
      const ordersRef = collection(db, 'stores', STORE_ID, 'orders');
      onSnapshot(
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
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore orders listener offline/fallback:', error);
        }
      );

      // Live sync for Products
      const productsRef = collection(db, 'stores', STORE_ID, 'products');
      onSnapshot(
        productsRef,
        (snap) => {
          if (!snap.empty) {
            const products: Product[] = [];
            snap.forEach((d) => {
              products.push(d.data() as Product);
            });
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore products listener offline/fallback:', error);
        }
      );

      // Live sync for Categories
      const categoriesRef = collection(db, 'stores', STORE_ID, 'categories');
      onSnapshot(
        categoriesRef,
        (snap) => {
          if (!snap.empty) {
            const categories: Category[] = [];
            snap.forEach((d) => {
              categories.push(d.data() as Category);
            });
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore categories listener offline/fallback:', error);
        }
      );
    } catch (e) {
      console.warn('Erro ao inicializar listeners do Firestore:', e);
    }
  },

  // CATEGORIES
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
    this.notifyChange();

    // Sync to Firestore
    try {
      categories.forEach(async (cat) => {
        const catRef = doc(db, 'stores', STORE_ID, 'categories', cat.id);
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
      const catRef = doc(db, 'stores', STORE_ID, 'categories', id);
      setDoc(catRef, newCat).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `stores/${STORE_ID}/categories/${id}`)
      );
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
      const catRef = doc(db, 'stores', STORE_ID, 'categories', categoryId);
      deleteDoc(catRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  // PRODUCTS
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
    this.notifyChange();

    // Sync to Firestore
    try {
      products.forEach(async (prod) => {
        const prodRef = doc(db, 'stores', STORE_ID, 'products', prod.id);
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
      const prodRef = doc(db, 'stores', STORE_ID, 'products', newProduct.id);
      setDoc(prodRef, newProduct).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `stores/${STORE_ID}/products/${newProduct.id}`)
      );
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
        const prodRef = doc(db, 'stores', STORE_ID, 'products', product.id);
        setDoc(prodRef, product).catch((err) =>
          handleFirestoreError(err, OperationType.UPDATE, `stores/${STORE_ID}/products/${product.id}`)
        );
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
      const prodRef = doc(db, 'stores', STORE_ID, 'products', productId);
      deleteDoc(prodRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  // ORDERS
  getOrders(): Order[] {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  },

  saveOrders(orders: Order[]) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    this.notifyChange();
  },

  createOrder(
    orderData: Omit<
      Order,
      'id' | 'displayId' | 'createdAt' | 'dateKey' | 'status' | 'statusHistory'
    >
  ): Order {
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
          note: 'Pedido recebido com sucesso',
        },
      ],
    };

    const updated = [newOrder, ...orders];
    this.saveOrders(updated);
    this.setActiveOrderId(newOrder.id);

    // Sync to Firestore
    try {
      const orderRef = doc(db, 'stores', STORE_ID, 'orders', newOrder.id);
      setDoc(orderRef, newOrder).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `stores/${STORE_ID}/orders/${newOrder.id}`)
      );
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

      // Sync to Firestore
      try {
        const orderRef = doc(db, 'stores', STORE_ID, 'orders', orderId);
        setDoc(orderRef, updatedOrder).catch((err) =>
          handleFirestoreError(err, OperationType.UPDATE, `stores/${STORE_ID}/orders/${orderId}`)
        );
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

    // Sync delete to Firestore
    try {
      const orderRef = doc(db, 'stores', STORE_ID, 'orders', orderId);
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
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    this.notifyChange();

    // Sync to Firestore
    try {
      const settingsRef = doc(db, 'stores', STORE_ID, 'settings', 'current');
      setDoc(settingsRef, settings).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `stores/${STORE_ID}/settings/current`)
      );
    } catch {
      // ignore
    }
  },
};

// Start sync immediately
storageService.initFirestoreSync();
