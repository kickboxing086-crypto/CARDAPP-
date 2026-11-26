import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Order, StoreSettings, OrderStatus, Category } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
} from '../data/initialData';
import { encryptDataForFirestore, decryptDataFromFirestore } from '../utils/crypto';
import { slugifyStoreName } from '../utils/constants';

let broadcastChannel: BroadcastChannel | null = null;
const localStorageQuotaFallbackKeys = new Set<string>();

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('cardapp_orders_realtime_sync');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'ORDER_CREATED' || event.data?.type === 'DATA_UPDATED') {
        const targetStore = event.data?.storeId as string | undefined;
        if (targetStore) {
          localStorageQuotaFallbackKeys.delete(`cardapp_orders_${targetStore}`);
          localStorageQuotaFallbackKeys.delete(`cardapp_products_${targetStore}`);
        }
        storageService.notifyChange();
      }
    };
  }
} catch {
  // ignore
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.startsWith('cardapp_')) {
      if (e.key) {
        localStorageQuotaFallbackKeys.delete(e.key);
      } else {
        localStorageQuotaFallbackKeys.clear();
      }
      storageService.notifyChange();
    }
  });

  window.addEventListener('focus', () => {
    storageService.notifyChange();
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        storageService.notifyChange();
      }
    });
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    localStorageQuotaFallbackKeys.delete(key);
    return true;
  } catch (err) {
    localStorageQuotaFallbackKeys.add(key);
    console.warn(`localStorage write warning (${key}):`, err);
    return false;
  }
}

const inMemoryProductsByStore: Record<string, Product[]> = {};
const inMemoryOrdersByStore: Record<string, Order[]> = {};
const inMemoryPendingOrdersByStore: Record<string, Record<string, number>> = {};
const ACTIVE_ORDER_ID_KEY = 'cardapp_active_order_id_v3';

function compactOrderForStorage(order: Order): Order {
  return {
    ...order,
    items: (order.items || []).map((item) => ({
      ...item,
      product: item.product?.image ? { ...item.product, image: '' } : item.product,
    })),
  };
}

export const storageService = {
  currentStoreId: 'default_store',
  authRole: null as 'super_admin' | 'store_admin' | null,
  authStoreId: null as string | null,
  authUid: null as string | null,
  listeners: [] as (() => void)[],
  unsubscribers: [] as Unsubscribe[],
  watchedClientOrderKeys: new Set<string>(),

  setAuthContext(role: 'super_admin' | 'store_admin' | null, storeId: string | null) {
    const nextUid = auth.currentUser?.uid || null;
    const changed =
      this.authRole !== role ||
      this.authStoreId !== storeId ||
      this.authUid !== nextUid;
    this.authRole = role;
    this.authStoreId = storeId;
    this.authUid = nextUid;
    if (changed) {
      this.initFirestoreSync();
    }
  },

  canAccessStoreOrders(targetStore: string): boolean {
    if (!auth.currentUser) return false;
    if (this.authRole === 'super_admin') return true;
    return this.authRole === 'store_admin' && this.authStoreId === targetStore;
  },

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
        safeSetLocalStorage(prodKey, JSON.stringify([]));
      }
      const ordKey = this.getOrdersKey();
      if (localStorage.getItem(ordKey) === null) {
        safeSetLocalStorage(ordKey, JSON.stringify([]));
      }
      const catKey = this.getCategoriesKey();
      if (localStorage.getItem(catKey) === null) {
        safeSetLocalStorage(catKey, JSON.stringify([{ id: 'todos', name: 'Todos os Itens' }]));
      }
      const setKey = this.getSettingsKey();
      if (localStorage.getItem(setKey) === null) {
        const freshSettings: StoreSettings = {
          ...INITIAL_SETTINGS,
          storeName: initialStoreName || 'Minha Loja',
          phoneWhatsapp: initialPhone || '',
          logoBase64: '',
          tagline: 'Cardápio Digital exclusivo com atendimento rápido e prático',
          instagramHandle: '',
          address: '',
          pixKey: '',
          deliveryNeighborhoods: [],
          isOpen: true,
        };
        safeSetLocalStorage(setKey, JSON.stringify(freshSettings));
      }
    }

    if (changed) {
      this.initFirestoreSync();
      this.notifyChange();
    }
  },

  async ensureStoreDocument(storeId?: string, storeName?: string): Promise<boolean> {
    const cleanId = storeId || this.currentStoreId;
    if (!auth.currentUser || !cleanId || cleanId === 'default_store' || cleanId === 'master_admin') {
      return false;
    }

    let resolvedName = (storeName || '').trim();
    if (!resolvedName || resolvedName === 'Minha Loja') {
      try {
        const stored = localStorage.getItem(`cardapp_settings_${cleanId}`);
        if (stored) {
          const parsedName = (JSON.parse(stored)?.storeName || '').trim();
          if (parsedName) resolvedName = parsedName;
        }
      } catch {}
    }
    if (!resolvedName) resolvedName = 'Minha Loja';

    const isFirebaseBootstrapAdmin =
      auth.currentUser.email?.toLowerCase() === 'kickboxing086@gmail.com' &&
      auth.currentUser.emailVerified === true;

    try {
      const storeRootRef = doc(db, 'stores', cleanId);
      await setDoc(
        storeRootRef,
        {
          id: cleanId,
          storeName: resolvedName,
          ...(!isFirebaseBootstrapAdmin ? { ownerUid: auth.currentUser.uid } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await this.syncStoreSlug(cleanId, resolvedName);
      return true;
    } catch (err) {
      console.warn('ensureStoreDocument notice:', err);
      return false;
    }
  },

  async syncStoreSlug(storeId?: string, storeName?: string): Promise<void> {
    const cleanId = storeId || this.currentStoreId;
    if (!auth.currentUser || !cleanId || cleanId === 'default_store' || cleanId === 'master_admin') {
      return;
    }
    const cleanName = (storeName || '').trim();
    const slug = slugifyStoreName(cleanName);
    if (!slug || slug.length < 2 || slug === 'minha-loja' || slug === 'cardapp-digital') {
      return;
    }
    try {
      await setDoc(
        doc(db, 'storeSlugs', slug),
        {
          slug,
          storeId: cleanId,
          storeName: cleanName.slice(0, 120),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('syncStoreSlug notice:', err);
    }
  },

  async syncAllStoreDataToFirestore(storeId?: string, storeName?: string): Promise<boolean> {
    const cleanId = storeId || this.currentStoreId;
    if (!auth.currentUser || !cleanId || cleanId === 'default_store' || cleanId === 'master_admin') {
      return false;
    }

    try {
      let localSettings: StoreSettings | null = null;
      try {
        const rawSet = localStorage.getItem(`cardapp_settings_${cleanId}`);
        if (rawSet) localSettings = JSON.parse(rawSet);
      } catch {}

      const localName = (localSettings?.storeName || '').trim();
      const paramName = (storeName || '').trim();
      const effectiveName =
        (localName && localName !== 'Minha Loja' ? localName : '') ||
        (paramName && paramName !== 'Minha Loja' ? paramName : '') ||
        localName ||
        paramName ||
        'Minha Loja';

      const rootOk = await this.ensureStoreDocument(cleanId, effectiveName);
      if (!rootOk) return false;

      if (localSettings) {
        try {
          await setDoc(
            doc(db, 'stores', cleanId, 'settings', 'current'),
            encryptDataForFirestore(localSettings)
          );
          this.clearSettingsPending(cleanId);
        } catch {}
      }

      try {
        const rawCats = localStorage.getItem(`cardapp_categories_${cleanId}`);
        if (rawCats) {
          const cats = JSON.parse(rawCats) as Category[];
          if (Array.isArray(cats)) {
            await Promise.all(
              cats.map((cat) =>
                setDoc(
                  doc(db, 'stores', cleanId, 'categories', cat.id),
                  encryptDataForFirestore(cat)
                )
              )
            );
            this.clearCategoriesPending(cleanId);
          }
        }
      } catch {}

      try {
        const rawProds = localStorage.getItem(`cardapp_products_${cleanId}`);
        const prods = rawProds
          ? (JSON.parse(rawProds) as Product[])
          : inMemoryProductsByStore[cleanId] || null;
        if (Array.isArray(prods)) {
          await Promise.all(
            prods.map(async (prod) => {
              const enc = encryptDataForFirestore(prod);
              if (typeof enc?.payload === 'string' && enc.payload.length >= 495000) {
                console.warn(`Produto "${prod.name}" excede o limite de tamanho do Firestore.`);
                return;
              }
              try {
                await setDoc(doc(db, 'stores', cleanId, 'products', prod.id), enc);
                this.clearProductPending(prod.id, cleanId);
              } catch {
                // mantém pendente localmente
              }
            })
          );
        }
      } catch {}
      return true;
    } catch (err) {
      console.warn('syncAllStoreDataToFirestore notice:', err);
      return false;
    }
  },

  async resolveStoreTarget(
    param: string
  ): Promise<{ storeId: string; storeName?: string } | null> {
    const clean = (param || '').trim();
    if (!clean || clean === 'default_store' || clean === 'master_admin') {
      return null;
    }

    const slug = slugifyStoreName(clean);
    if (slug && slug.length >= 2) {
      try {
        const slugSnap = await getDoc(doc(db, 'storeSlugs', slug));
        if (slugSnap.exists()) {
          const data = slugSnap.data() as { storeId?: string; storeName?: string };
          if (data?.storeId) {
            return { storeId: data.storeId, storeName: data.storeName };
          }
        }
      } catch {}
    }

    try {
      const storeSnap = await getDoc(doc(db, 'stores', clean));
      if (storeSnap.exists()) {
        const data = storeSnap.data() as { storeName?: string };
        return { storeId: storeSnap.id, storeName: data?.storeName };
      }
    } catch {}

    // Fallback local (mesmo navegador) caso as configurações da loja ainda estejam apenas no localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cardapp_settings_')) {
            const candidateId = key.slice('cardapp_settings_'.length);
            if (!candidateId || candidateId === 'default_store' || candidateId === 'master_admin') {
              continue;
            }
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw) as StoreSettings;
            const parsedSlug = slugifyStoreName(parsed?.storeName);
            if (
              candidateId === clean ||
              (slug && slug.length >= 2 && parsedSlug === slug)
            ) {
              return { storeId: candidateId, storeName: parsed?.storeName };
            }
          }
        }
      }
    } catch {}

    return null;
  },

  async loadStoreFromFirestoreOnce(storeId: string): Promise<boolean> {
    const cleanId = (storeId || '').trim();
    if (!cleanId || cleanId === 'default_store' || cleanId === 'master_admin') {
      return false;
    }

    let foundAny = false;
    try {
      const [rootRes, settingsRes, catsRes, prodsRes] = await Promise.allSettled([
        getDoc(doc(db, 'stores', cleanId)),
        getDoc(doc(db, 'stores', cleanId, 'settings', 'current')),
        getDocs(collection(db, 'stores', cleanId, 'categories')),
        getDocs(collection(db, 'stores', cleanId, 'products')),
      ]);

      let rootStoreName = '';
      if (rootRes.status === 'fulfilled' && rootRes.value.exists()) {
        foundAny = true;
        rootStoreName = (rootRes.value.data() as { storeName?: string })?.storeName || '';
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.exists()) {
        const data = decryptDataFromFirestore<StoreSettings>(settingsRes.value.data());
        const isPendingSettings = Boolean(this.getPendingSettingsTimestamp(cleanId));
        let localSettingsTs = 0;
        try {
          const existingRaw = localStorage.getItem(`cardapp_settings_${cleanId}`);
          if (existingRaw) {
            const existing = JSON.parse(existingRaw) as StoreSettings;
            localSettingsTs = existing?.updatedAt ? Date.parse(existing.updatedAt) || 0 : 0;
          }
        } catch {}
        const remoteSettingsTs = data?.updatedAt ? Date.parse(data.updatedAt) || 0 : 0;

        if (!isPendingSettings && localSettingsTs <= remoteSettingsTs) {
          foundAny = true;
          safeSetLocalStorage(`cardapp_settings_${cleanId}`, JSON.stringify(data));
        }
      } else if (rootStoreName) {
        try {
          const existingRaw = localStorage.getItem(`cardapp_settings_${cleanId}`);
          const base = existingRaw ? JSON.parse(existingRaw) : { ...INITIAL_SETTINGS };
          if (!base.storeName || base.storeName === 'Minha Loja') {
            safeSetLocalStorage(
              `cardapp_settings_${cleanId}`,
              JSON.stringify({ ...base, storeName: rootStoreName })
            );
          }
        } catch {}
      }

      if (catsRes.status === 'fulfilled' && !catsRes.value.empty) {
        if (!this.getPendingCategoriesTimestamp(cleanId)) {
          foundAny = true;
          const categories: Category[] = [];
          catsRes.value.forEach((d) => {
            categories.push(decryptDataFromFirestore<Category>(d.data()));
          });
          safeSetLocalStorage(`cardapp_categories_${cleanId}`, JSON.stringify(categories));
        }
      }

      if (prodsRes.status === 'fulfilled' && !prodsRes.value.empty) {
        foundAny = true;
        const remoteProducts: Product[] = [];
        prodsRes.value.forEach((d) => {
          remoteProducts.push(decryptDataFromFirestore<Product>(d.data()));
        });
        const merged = this.mergeProductsWithLocal(cleanId, remoteProducts, {
          preserveMissingLocal: true,
        });
        inMemoryProductsByStore[cleanId] = merged;
        safeSetLocalStorage(`cardapp_products_${cleanId}`, JSON.stringify(merged));
      }

      if (foundAny) {
        this.notifyChange();
      }
    } catch (err) {
      console.warn('loadStoreFromFirestoreOnce notice:', err);
    }

    return foundAny;
  },

  initializeNewStore(
    storeId: string,
    storeName: string,
    phoneWhatsapp?: string,
    storeExtras?: {
      logoBase64?: string;
      address?: string;
      tagline?: string;
      instagramHandle?: string;
    }
  ): StoreSettings {
    const cleanId = storeId || `store_${Date.now()}`;
    const prodKey = `cardapp_products_${cleanId}`;
    const ordKey = `cardapp_orders_${cleanId}`;
    const catKey = `cardapp_categories_${cleanId}`;
    const setKey = `cardapp_settings_${cleanId}`;

    const freshSettings: StoreSettings = {
      ...INITIAL_SETTINGS,
      storeName: storeName || 'Minha Loja',
      phoneWhatsapp: phoneWhatsapp || '',
      logoBase64: storeExtras?.logoBase64 || '',
      tagline: storeExtras?.tagline?.trim() || 'Cardápio Digital exclusivo com atendimento rápido e prático',
      instagramHandle: storeExtras?.instagramHandle?.trim() || '',
      address: storeExtras?.address?.trim() || '',
      pixKey: '',
      deliveryNeighborhoods: [],
      isOpen: true,
    };

    localStorage.setItem(prodKey, JSON.stringify([]));
    localStorage.setItem(ordKey, JSON.stringify([]));
    localStorage.setItem(catKey, JSON.stringify([{ id: 'todos', name: 'Todos os Itens' }]));
    localStorage.setItem(setKey, JSON.stringify(freshSettings));

    (async () => {
      if (auth.currentUser) {
        await this.ensureStoreDocument(cleanId, freshSettings.storeName);
        const setRef = doc(db, 'stores', cleanId, 'settings', 'current');
        await setDoc(setRef, encryptDataForFirestore(freshSettings)).catch(() => {});
      }
    })().catch(() => {});

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

  watchClientOrderStatus(targetStore: string, orderId: string) {
    if (!targetStore || !orderId || targetStore === 'default_store' || targetStore === 'master_admin') {
      return;
    }
    if (this.canAccessStoreOrders(targetStore)) {
      return;
    }
    const watchKey = `${targetStore}:${orderId}`;
    if (this.watchedClientOrderKeys.has(watchKey)) return;
    this.watchedClientOrderKeys.add(watchKey);

    try {
      const statusRef = doc(db, 'stores', targetStore, 'orderStatus', orderId);
      const unsubStatus = onSnapshot(
        statusRef,
        (snap) => {
          if (this.currentStoreId !== targetStore) return;
          if (this.canAccessStoreOrders(targetStore)) return;
          if (!snap.exists()) return;
          const statusData = snap.data() as {
            status?: OrderStatus;
            statusHistory?: Order['statusHistory'];
            updatedAt?: string;
          };
          if (!statusData?.status) return;

          const pendingOrderMap = this.getPendingOrderMap(targetStore);
          if (pendingOrderMap[orderId]) {
            return;
          }

          const currentOrders = this.readRawOrdersForStore(targetStore);
          let updatedAny = false;
          const nextOrders = currentOrders.map((o) => {
            if (o.id !== orderId) return o;

            const localHist = o.statusHistory || [];
            const remoteHist = Array.isArray(statusData.statusHistory) ? statusData.statusHistory : [];
            const localLastTs = localHist.length
              ? Date.parse(localHist[localHist.length - 1].timestamp || '') || 0
              : 0;
            const remoteLastTs = remoteHist.length
              ? Date.parse(remoteHist[remoteHist.length - 1].timestamp || '') || 0
              : statusData.updatedAt
              ? Date.parse(statusData.updatedAt) || 0
              : 0;

            const isRemoteNewer =
              remoteHist.length > localHist.length ||
              (remoteHist.length === localHist.length && remoteLastTs > localLastTs) ||
              (localHist.length === 0 && o.status !== statusData.status);

            if (
              isRemoteNewer &&
              (o.status !== statusData.status || remoteHist.length !== localHist.length)
            ) {
              updatedAny = true;
              return {
                ...o,
                status: statusData.status!,
                statusHistory: remoteHist.length > 0 ? remoteHist : o.statusHistory,
              };
            }
            return o;
          });
          if (updatedAny) {
            inMemoryOrdersByStore[targetStore] = nextOrders;
            safeSetLocalStorage(`cardapp_orders_${targetStore}`, JSON.stringify(nextOrders));
            this.notifyChange();
          }
        },
        () => {
          // fallback silencioso
        }
      );
      this.unsubscribers.push(unsubStatus);
    } catch {
      // ignore
    }
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
    this.watchedClientOrderKeys.clear();

    const targetStore = this.currentStoreId;

    try {
      // Live sync for Settings (Criptografado)
      const settingsRef = doc(db, 'stores', targetStore, 'settings', 'current');
      const unsubSettings = onSnapshot(
        settingsRef,
        (snap) => {
          if (this.currentStoreId !== targetStore) return;
          if (snap.exists()) {
            const data = decryptDataFromFirestore<StoreSettings>(snap.data());
            const isPending = Boolean(this.getPendingSettingsTimestamp(targetStore));
            let localSettings: StoreSettings | null = null;
            let localTs = 0;
            try {
              const rawLocal = localStorage.getItem(`cardapp_settings_${targetStore}`);
              if (rawLocal) {
                localSettings = JSON.parse(rawLocal) as StoreSettings;
                localTs = localSettings?.updatedAt ? Date.parse(localSettings.updatedAt) || 0 : 0;
              }
            } catch {}
            const remoteTs = data?.updatedAt ? Date.parse(data.updatedAt) || 0 : 0;

            if (isPending || (localSettings && localTs > remoteTs)) {
              if (auth.currentUser && localSettings) {
                setDoc(settingsRef, encryptDataForFirestore(localSettings))
                  .then(() => this.clearSettingsPending(targetStore))
                  .catch(() => {});
              }
              return;
            }

            safeSetLocalStorage(`cardapp_settings_${targetStore}`, JSON.stringify(data));
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore settings listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubSettings);

      // Live sync for Orders (PII protegida: somente dono autenticado da loja ou Admin Geral)
      if (this.canAccessStoreOrders(targetStore)) {
        const ordersRef = collection(db, 'stores', targetStore, 'orders');
        const unsubOrders = onSnapshot(
          ordersRef,
          (snap) => {
            if (this.currentStoreId !== targetStore) return;
            const remoteOrders: Order[] = [];
            snap.forEach((d) => {
              remoteOrders.push(decryptDataFromFirestore<Order>(d.data()));
            });

            const deletedIds = this.getDeletedOrderIds();
            const pendingOrderMap = this.getPendingOrderMap(targetStore);
            const localOrders = this.readRawOrdersForStore(targetStore);
            const ordersMap = new Map<string, Order>();

            remoteOrders.forEach((o) => {
              if (o?.id && !deletedIds.has(o.id)) {
                ordersMap.set(o.id, compactOrderForStorage(o));
              }
            });

            const ordersToSync: Order[] = [];
            localOrders.forEach((rawLocal) => {
              if (!rawLocal?.id || deletedIds.has(rawLocal.id)) return;
              const localOrder = compactOrderForStorage(rawLocal);
              const remoteOrder = ordersMap.get(localOrder.id);
              const isPending = Boolean(pendingOrderMap[localOrder.id]);

              if (!remoteOrder) {
                ordersMap.set(localOrder.id, localOrder);
                ordersToSync.push(localOrder);
                return;
              }

              const localHist = localOrder.statusHistory || [];
              const remoteHist = remoteOrder.statusHistory || [];
              const localLastTs = localHist.length
                ? Date.parse(localHist[localHist.length - 1].timestamp || '') || 0
                : 0;
              const remoteLastTs = remoteHist.length
                ? Date.parse(remoteHist[remoteHist.length - 1].timestamp || '') || 0
                : 0;

              if (
                isPending ||
                localHist.length > remoteHist.length ||
                localLastTs > remoteLastTs
              ) {
                ordersMap.set(localOrder.id, localOrder);
                ordersToSync.push(localOrder);
              }
            });

            const merged = Array.from(ordersMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            inMemoryOrdersByStore[targetStore] = merged;
            safeSetLocalStorage(`cardapp_orders_${targetStore}`, JSON.stringify(merged));
            this.notifyChange();

            if (auth.currentUser && ordersToSync.length > 0) {
              ordersToSync.forEach((o) => {
                this.syncOrderToFirestore(targetStore, o).catch(() => {});
              });
            }
          },
          (error) => {
            console.warn('Firestore orders listener offline/protected:', error?.message);
          }
        );
        this.unsubscribers.push(unsubOrders);
      } else {
        // Cliente público: acompanha APENAS o status não-PII dos próprios pedidos desta sessão
        const activeId = this.getActiveOrderId();
        const combinedIds = Array.from(
          new Set([...(activeId ? [activeId] : []), ...this.getClientOrderIds()])
        ).slice(0, 10);
        combinedIds.forEach((orderId) => {
          this.watchClientOrderStatus(targetStore, orderId);
        });
      }

      // Live sync for Products (Criptografado)
      const productsRef = collection(db, 'stores', targetStore, 'products');
      const unsubProducts = onSnapshot(
        productsRef,
        (snap) => {
          const remoteProducts: Product[] = [];
          snap.forEach((d) => {
            remoteProducts.push(decryptDataFromFirestore<Product>(d.data()));
          });

          const localProducts = this.readRawProductsForStore(targetStore);
          const pendingMap = this.getPendingProductMap(targetStore);
          const hasPending = Object.keys(pendingMap).length > 0;

          // Se não há autenticação Firebase ativa e o remoto veio vazio, preserva produtos locais
          if (snap.empty && (!auth.currentUser || hasPending || targetStore === 'default_store')) {
            if (localProducts.length > 0 && auth.currentUser && hasPending) {
              localProducts.forEach((lp) => {
                if (pendingMap[lp.id]) {
                  this.syncSingleProductToFirestore(targetStore, lp);
                }
              });
            }
            return;
          }

          if (snap.empty && localProducts.length === 0) {
            return;
          }

          const merged = this.mergeProductsWithLocal(targetStore, remoteProducts, {
            preserveMissingLocal: !auth.currentUser || snap.metadata.fromCache,
          });

          inMemoryProductsByStore[targetStore] = merged;
          safeSetLocalStorage(`cardapp_products_${targetStore}`, JSON.stringify(merged));
          this.notifyChange();

          // Reenvia produtos pendentes (ou cuja foto local ainda não subiu para o Firestore)
          if (auth.currentUser) {
            const remoteById = new Map(remoteProducts.map((p) => [p.id, p]));
            merged.forEach((mp) => {
              const remoteMatch = remoteById.get(mp.id);
              if (pendingMap[mp.id] || (mp.image && remoteMatch && !remoteMatch.image)) {
                this.syncSingleProductToFirestore(targetStore, mp);
              }
            });
          }
        },
        (error) => {
          console.warn('Firestore products listener offline/fallback:', error);
        }
      );
      this.unsubscribers.push(unsubProducts);

      // Live sync for Categories (Criptografado)
      const categoriesRef = collection(db, 'stores', targetStore, 'categories');
      const unsubCats = onSnapshot(
        categoriesRef,
        (snap) => {
          if (this.currentStoreId !== targetStore) return;
          if (!snap.empty) {
            if (this.getPendingCategoriesTimestamp(targetStore)) {
              return;
            }
            const categories: Category[] = [];
            snap.forEach((d) => {
              categories.push(decryptDataFromFirestore<Category>(d.data()));
            });
            safeSetLocalStorage(`cardapp_categories_${targetStore}`, JSON.stringify(categories));
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
  getPendingCategoriesTimestamp(storeId?: string): number {
    const cleanId = storeId || this.currentStoreId;
    try {
      const val = localStorage.getItem(`cardapp_pending_categories_${cleanId}`);
      return val ? Number(val) || 0 : 0;
    } catch {
      return 0;
    }
  },

  markCategoriesPending(storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    safeSetLocalStorage(`cardapp_pending_categories_${cleanId}`, String(Date.now()));
  },

  clearCategoriesPending(storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      localStorage.removeItem(`cardapp_pending_categories_${cleanId}`);
    } catch {}
  },

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
    const storeId = this.currentStoreId;
    this.markCategoriesPending(storeId);
    safeSetLocalStorage(`cardapp_categories_${storeId}`, JSON.stringify(categories));
    this.notifyChange();

    // Sync to Firestore (Criptografado)
    (async () => {
      if (!auth.currentUser) return;
      await this.ensureStoreDocument(storeId);
      await Promise.all(
        categories.map((cat) =>
          setDoc(doc(db, 'stores', storeId, 'categories', cat.id), encryptDataForFirestore(cat))
        )
      );
      this.clearCategoriesPending(storeId);
    })().catch(() => {});
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
  getDeletedProductIds(storeId?: string): Set<string> {
    const cleanId = storeId || this.currentStoreId;
    try {
      const stored = localStorage.getItem(`cardapp_deleted_products_${cleanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  },

  addDeletedProductId(productId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      const set = this.getDeletedProductIds(cleanId);
      set.add(productId);
      safeSetLocalStorage(
        `cardapp_deleted_products_${cleanId}`,
        JSON.stringify(Array.from(set).slice(-150))
      );
    } catch {}
  },

  removeDeletedProductId(productId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      const set = this.getDeletedProductIds(cleanId);
      if (set.delete(productId)) {
        safeSetLocalStorage(
          `cardapp_deleted_products_${cleanId}`,
          JSON.stringify(Array.from(set))
        );
      }
    } catch {}
  },

  getPendingProductMap(storeId?: string): Record<string, number> {
    const cleanId = storeId || this.currentStoreId;
    try {
      const stored = localStorage.getItem(`cardapp_pending_products_${cleanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  },

  markProductPending(productId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      const map = this.getPendingProductMap(cleanId);
      map[productId] = Date.now();
      safeSetLocalStorage(`cardapp_pending_products_${cleanId}`, JSON.stringify(map));
    } catch {}
  },

  clearProductPending(productId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      const map = this.getPendingProductMap(cleanId);
      if (productId in map) {
        delete map[productId];
        safeSetLocalStorage(`cardapp_pending_products_${cleanId}`, JSON.stringify(map));
      }
    } catch {}
  },

  readRawProductsForStore(storeId: string): Product[] {
    const key = `cardapp_products_${storeId}`;
    if (localStorageQuotaFallbackKeys.has(key) && Array.isArray(inMemoryProductsByStore[storeId])) {
      return inMemoryProductsByStore[storeId];
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryProductsByStore[storeId] = parsed;
          return parsed;
        }
      }
    } catch {}
    if (Array.isArray(inMemoryProductsByStore[storeId])) {
      return inMemoryProductsByStore[storeId];
    }
    return [];
  },

  mergeProductsWithLocal(
    storeId: string,
    remoteProducts: Product[],
    options?: { preserveMissingLocal?: boolean }
  ): Product[] {
    const deletedIds = this.getDeletedProductIds(storeId);
    const pendingMap = this.getPendingProductMap(storeId);
    const localProducts = this.readRawProductsForStore(storeId);
    const mergedMap = new Map<string, Product>();

    remoteProducts.forEach((rp) => {
      if (rp?.id && !deletedIds.has(rp.id)) {
        mergedMap.set(rp.id, rp);
      }
    });

    localProducts.forEach((lp) => {
      if (!lp?.id || deletedIds.has(lp.id)) return;
      const remote = mergedMap.get(lp.id);
      const isPending = Boolean(pendingMap[lp.id]);

      if (!remote) {
        if (isPending || options?.preserveMissingLocal) {
          mergedMap.set(lp.id, lp);
        }
        return;
      }

      const localTs = lp.updatedAt ? Date.parse(lp.updatedAt) : 0;
      const remoteTs = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
      const localHasNewerImage = Boolean(lp.image) && !remote.image && (isPending || localTs >= remoteTs);

      if (isPending || localTs > remoteTs || localHasNewerImage) {
        mergedMap.set(lp.id, lp);
      }
    });

    return Array.from(mergedMap.values());
  },

  async syncSingleProductToFirestore(storeId: string, product: Product): Promise<boolean> {
    if (!auth.currentUser || !storeId || storeId === 'default_store' || storeId === 'master_admin') {
      return false;
    }
    try {
      await this.ensureStoreDocument(storeId);
      const encrypted = encryptDataForFirestore(product);
      if (typeof encrypted?.payload === 'string' && encrypted.payload.length >= 495000) {
        console.warn(`Sync product "${product.name}" aborted: encrypted payload exceeds 495KB.`);
        return false;
      }
      const prodRef = doc(db, 'stores', storeId, 'products', product.id);
      await setDoc(prodRef, encrypted);
      this.clearProductPending(product.id, storeId);
      return true;
    } catch (err) {
      console.warn('Sync product fallback:', err);
      return false;
    }
  },

  getProducts(): Product[] {
    const key = this.getProductsKey();
    if (localStorageQuotaFallbackKeys.has(key) && Array.isArray(inMemoryProductsByStore[this.currentStoreId])) {
      return inMemoryProductsByStore[this.currentStoreId];
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryProductsByStore[this.currentStoreId] = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    if (Array.isArray(inMemoryProductsByStore[this.currentStoreId])) {
      return inMemoryProductsByStore[this.currentStoreId];
    }
    if (this.currentStoreId === 'default_store' || this.currentStoreId === 'master_admin') {
      inMemoryProductsByStore[this.currentStoreId] = INITIAL_PRODUCTS;
      safeSetLocalStorage(key, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    // Para contas novas de clientes/lojistas: começa 100% zerado
    inMemoryProductsByStore[this.currentStoreId] = [];
    safeSetLocalStorage(key, JSON.stringify([]));
    return [];
  },

  saveProducts(products: Product[]) {
    const storeId = this.currentStoreId;
    const stamped = products.map((p) => ({
      ...p,
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
    inMemoryProductsByStore[storeId] = stamped;
    safeSetLocalStorage(this.getProductsKey(), JSON.stringify(stamped));
    this.notifyChange();

    // Sync to Firestore (Criptografado)
    (async () => {
      await Promise.all(stamped.map((prod) => this.syncSingleProductToFirestore(storeId, prod)));
    })().catch(() => {});
  },

  addProduct(product: Omit<Product, 'id'>): Product {
    const storeId = this.currentStoreId;
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newProduct, ...products];
    this.removeDeletedProductId(newProduct.id, storeId);
    this.markProductPending(newProduct.id, storeId);
    inMemoryProductsByStore[storeId] = updated;
    safeSetLocalStorage(this.getProductsKey(), JSON.stringify(updated));
    this.notifyChange();

    // Sync new product to Firestore (Criptografado)
    this.syncSingleProductToFirestore(storeId, newProduct).catch(() => {});

    return newProduct;
  },

  updateProduct(product: Product) {
    const storeId = this.currentStoreId;
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const stampedProduct: Product = {
      ...product,
      updatedAt: new Date().toISOString(),
    };
    if (index !== -1) {
      const nextProducts = [...products];
      nextProducts[index] = stampedProduct;
      this.removeDeletedProductId(stampedProduct.id, storeId);
      this.markProductPending(stampedProduct.id, storeId);
      inMemoryProductsByStore[storeId] = nextProducts;
      safeSetLocalStorage(this.getProductsKey(), JSON.stringify(nextProducts));
      this.notifyChange();

      // Sync to Firestore (Criptografado)
      this.syncSingleProductToFirestore(storeId, stampedProduct).catch(() => {});
    }
  },

  deleteProduct(productId: string) {
    const storeId = this.currentStoreId;
    const products = this.getProducts();
    const updated = products.filter((p) => p.id !== productId);
    this.addDeletedProductId(productId, storeId);
    this.clearProductPending(productId, storeId);
    inMemoryProductsByStore[storeId] = updated;
    safeSetLocalStorage(this.getProductsKey(), JSON.stringify(updated));
    this.notifyChange();

    // Sync to Firestore
    try {
      const prodRef = doc(db, 'stores', storeId, 'products', productId);
      deleteDoc(prodRef).catch(() => {});
    } catch {
      // ignore
    }
  },

  // ORDERS
  getPendingOrderMap(storeId?: string): Record<string, number> {
    const cleanId = storeId || this.currentStoreId;
    const memMap = inMemoryPendingOrdersByStore[cleanId] || {};
    try {
      const stored = localStorage.getItem(`cardapp_pending_orders_${cleanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return { ...parsed, ...memMap };
        }
      }
    } catch {}
    return { ...memMap };
  },

  markOrderPending(orderId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    const now = Date.now();
    inMemoryPendingOrdersByStore[cleanId] = {
      ...(inMemoryPendingOrdersByStore[cleanId] || {}),
      [orderId]: now,
    };
    try {
      const map = this.getPendingOrderMap(cleanId);
      map[orderId] = now;
      safeSetLocalStorage(`cardapp_pending_orders_${cleanId}`, JSON.stringify(map));
    } catch {}
  },

  clearOrderPending(orderId: string, storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    if (inMemoryPendingOrdersByStore[cleanId] && orderId in inMemoryPendingOrdersByStore[cleanId]) {
      delete inMemoryPendingOrdersByStore[cleanId][orderId];
    }
    try {
      const map = this.getPendingOrderMap(cleanId);
      if (orderId in map) {
        delete map[orderId];
        safeSetLocalStorage(`cardapp_pending_orders_${cleanId}`, JSON.stringify(map));
      }
    } catch {}
  },

  readRawOrdersForStore(storeId: string): Order[] {
    const key = `cardapp_orders_${storeId}`;
    if (localStorageQuotaFallbackKeys.has(key) && Array.isArray(inMemoryOrdersByStore[storeId])) {
      return inMemoryOrdersByStore[storeId];
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryOrdersByStore[storeId] = parsed;
          return parsed;
        }
      }
    } catch {}
    if (Array.isArray(inMemoryOrdersByStore[storeId])) {
      return inMemoryOrdersByStore[storeId];
    }
    return [];
  },

  async syncOrderToFirestore(storeId: string, order: Order): Promise<boolean> {
    if (!storeId || storeId === 'default_store' || storeId === 'master_admin') {
      return false;
    }
    if (auth.currentUser) {
      await this.ensureStoreDocument(storeId).catch(() => {});
    }
    const compactOrder = compactOrderForStorage(order);
    const trimmedHistory = (compactOrder.statusHistory || []).slice(-25);
    const nowIso =
      trimmedHistory.length > 0
        ? trimmedHistory[trimmedHistory.length - 1].timestamp
        : compactOrder.createdAt;
    let orderOk = false;
    try {
      const orderRef = doc(db, 'stores', storeId, 'orders', compactOrder.id);
      const encrypted = encryptDataForFirestore(compactOrder);
      if (typeof encrypted?.payload === 'string' && encrypted.payload.length < 195000) {
        await setDoc(orderRef, encrypted);
        orderOk = true;
      }
    } catch (err) {
      console.warn('Sync order fallback:', err);
    }

    try {
      const statusRef = doc(db, 'stores', storeId, 'orderStatus', compactOrder.id);
      await setDoc(
        statusRef,
        {
          id: compactOrder.id,
          displayId: compactOrder.displayId,
          status: compactOrder.status,
          statusHistory: trimmedHistory,
          deliveryType: compactOrder.customer.deliveryType,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Sync orderStatus fallback:', err);
    }

    if (orderOk) {
      this.clearOrderPending(compactOrder.id, storeId);
    }
    return orderOk;
  },

  getOrders(): Order[] {
    const key = this.getOrdersKey();
    if (localStorageQuotaFallbackKeys.has(key) && Array.isArray(inMemoryOrdersByStore[this.currentStoreId])) {
      return inMemoryOrdersByStore[this.currentStoreId];
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryOrdersByStore[this.currentStoreId] = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    if (Array.isArray(inMemoryOrdersByStore[this.currentStoreId])) {
      return inMemoryOrdersByStore[this.currentStoreId];
    }
    if (this.currentStoreId === 'default_store' || this.currentStoreId === 'master_admin') {
      inMemoryOrdersByStore[this.currentStoreId] = INITIAL_ORDERS;
      safeSetLocalStorage(key, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    // Para contas novas de clientes/lojistas: começa 100% zerado
    inMemoryOrdersByStore[this.currentStoreId] = [];
    safeSetLocalStorage(key, JSON.stringify([]));
    return [];
  },

  saveOrders(orders: Order[]) {
    const compacted = orders.map(compactOrderForStorage);
    inMemoryOrdersByStore[this.currentStoreId] = compacted;
    safeSetLocalStorage(this.getOrdersKey(), JSON.stringify(compacted));
    this.notifyChange();
  },

  createOrder(
    orderData: Omit<
      Order,
      'id' | 'displayId' | 'createdAt' | 'dateKey' | 'status' | 'statusHistory'
    >
  ): Order {
    const storeId = this.currentStoreId;
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

    let randomHex = Math.random().toString(36).substring(2, 10);
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        randomHex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
    } catch {
      // ignore
    }

    const newOrder: Order = compactOrderForStorage({
      ...orderData,
      id: `ord-${Date.now()}-${randomHex}`,
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
    });

    const updated = [newOrder, ...orders];
    this.markOrderPending(newOrder.id, storeId);
    this.saveOrders(updated);
    this.setActiveOrderId(newOrder.id);
    this.addClientOrderId(newOrder.id);
    if (!this.canAccessStoreOrders(storeId)) {
      this.watchClientOrderStatus(storeId, newOrder.id);
    }

    // Notifica instantaneamente qualquer aba aberta (ex: tela do CEO)
    try {
      broadcastChannel?.postMessage({
        type: 'ORDER_CREATED',
        storeId,
        orderId: newOrder.id,
      });
    } catch {
      // ignore
    }

    // Sync to Firestore: pedido completo (PII criptografada) + espelho público de status (sem PII)
    this.syncOrderToFirestore(storeId, newOrder).catch(() => {});

    return newOrder;
  },

  updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string) {
    const storeId = this.currentStoreId;
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      const current = orders[index];
      const existingHistory = current.statusHistory || [];
      const prevLastTs = existingHistory.length
        ? Date.parse(existingHistory[existingHistory.length - 1].timestamp || '') || 0
        : 0;
      const nowIso = new Date(Math.max(Date.now(), prevLastTs + 1)).toISOString();
      const updatedHistory = [
        ...existingHistory,
        {
          status: newStatus,
          timestamp: nowIso,
          note: note || `Status alterado para ${newStatus}`,
        },
      ].slice(-25);

      const updatedOrder: Order = compactOrderForStorage({
        ...current,
        status: newStatus,
        statusHistory: updatedHistory,
      });

      const nextOrders = [...orders];
      nextOrders[index] = updatedOrder;
      this.markOrderPending(orderId, storeId);
      this.saveOrders(nextOrders);

      try {
        broadcastChannel?.postMessage({
          type: 'DATA_UPDATED',
          storeId,
          orderId,
        });
      } catch {
        // ignore
      }

      // Sync to Firestore (Criptografado + espelho de status sem PII)
      this.syncOrderToFirestore(storeId, updatedOrder).catch(() => {});
    }
  },

  deleteOrder(orderId: string): boolean {
    const orders = this.getOrders();
    const updated = orders.filter((o) => o.id !== orderId);
    this.saveOrders(updated);
    this.addDeletedOrderId(orderId);

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
      const statusRef = doc(db, 'stores', this.currentStoreId, 'orderStatus', orderId);
      deleteDoc(statusRef).catch(() => {});
    } catch {
      // ignore
    }

    return true;
  },

  getActiveOrderId(): string | null {
    try {
      const perStore = localStorage.getItem(`cardapp_active_order_id_${this.currentStoreId}`);
      if (perStore) return perStore;
      return localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    } catch {
      return null;
    }
  },

  setActiveOrderId(id: string) {
    try {
      localStorage.setItem(`cardapp_active_order_id_${this.currentStoreId}`, id);
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, id);
      this.notifyChange();
    } catch {
      // ignore
    }
  },

  clearActiveOrderId() {
    try {
      localStorage.removeItem(`cardapp_active_order_id_${this.currentStoreId}`);
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
      this.notifyChange();
    } catch {
      // ignore
    }
  },

  getDeletedOrderIds(): Set<string> {
    try {
      const stored = localStorage.getItem(`cardapp_deleted_orders_${this.currentStoreId}`);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  },

  addDeletedOrderId(orderId: string) {
    try {
      const set = this.getDeletedOrderIds();
      set.add(orderId);
      const arr = Array.from(set).slice(-100);
      localStorage.setItem(`cardapp_deleted_orders_${this.currentStoreId}`, JSON.stringify(arr));
    } catch {
      // ignore
    }
  },

  getClientOrderIds(): string[] {
    try {
      const stored = localStorage.getItem(`cardapp_client_orders_${this.currentStoreId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  },

  addClientOrderId(orderId: string) {
    try {
      const list = this.getClientOrderIds();
      if (!list.includes(orderId)) {
        list.unshift(orderId);
        localStorage.setItem(`cardapp_client_orders_${this.currentStoreId}`, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  },

  // STORE SETTINGS
  getPendingSettingsTimestamp(storeId?: string): number {
    const cleanId = storeId || this.currentStoreId;
    try {
      const val = localStorage.getItem(`cardapp_pending_settings_${cleanId}`);
      return val ? Number(val) || 0 : 0;
    } catch {
      return 0;
    }
  },

  markSettingsPending(storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    safeSetLocalStorage(`cardapp_pending_settings_${cleanId}`, String(Date.now()));
  },

  clearSettingsPending(storeId?: string) {
    const cleanId = storeId || this.currentStoreId;
    try {
      localStorage.removeItem(`cardapp_pending_settings_${cleanId}`);
    } catch {}
  },

  getSettings(): StoreSettings {
    try {
      const stored = localStorage.getItem(this.getSettingsKey());
      if (stored && stored !== 'null' && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Garante que o cardápio de demonstração NUNCA contenha WhatsApp pessoal
          if (this.currentStoreId === 'default_store' && parsed.phoneWhatsapp) {
            parsed.phoneWhatsapp = '';
            safeSetLocalStorage(this.getSettingsKey(), JSON.stringify(parsed));
          }
          return {
            ...INITIAL_SETTINGS,
            ...parsed,
            storeName: parsed.storeName || (this.currentStoreId === 'default_store' ? INITIAL_SETTINGS.storeName : 'Minha Loja'),
          };
        }
      }
    } catch {
      // fallback
    }
    if (this.currentStoreId !== 'default_store' && this.currentStoreId !== 'master_admin') {
      const freshSettings: StoreSettings = {
        ...INITIAL_SETTINGS,
        storeName: 'Minha Loja',
        phoneWhatsapp: '',
        logoBase64: '',
        tagline: 'Cardápio Digital exclusivo com atendimento rápido e prático',
        instagramHandle: '',
        address: '',
        pixKey: '',
        deliveryNeighborhoods: [],
        isOpen: true,
      };
      safeSetLocalStorage(this.getSettingsKey(), JSON.stringify(freshSettings));
      return freshSettings;
    }
    safeSetLocalStorage(this.getSettingsKey(), JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    const storeId = this.currentStoreId;
    const stampedSettings: StoreSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    // Nunca permitir salvar WhatsApp pessoal no cardápio de demonstração
    if (storeId === 'default_store') {
      stampedSettings.phoneWhatsapp = '';
    }
    this.markSettingsPending(storeId);
    safeSetLocalStorage(`cardapp_settings_${storeId}`, JSON.stringify(stampedSettings));
    this.notifyChange();

    try {
      broadcastChannel?.postMessage({
        type: 'DATA_UPDATED',
        storeId,
      });
    } catch {
      // ignore
    }

    // Sync to Firestore (Criptografado) garantindo /stores/{storeId} + /storeSlugs/{slug} primeiro
    (async () => {
      if (!auth.currentUser || storeId === 'default_store' || storeId === 'master_admin') {
        return;
      }
      await this.ensureStoreDocument(storeId, stampedSettings.storeName);
      const settingsRef = doc(db, 'stores', storeId, 'settings', 'current');
      await setDoc(settingsRef, encryptDataForFirestore(stampedSettings));
      this.clearSettingsPending(storeId);
    })().catch((err) => {
      console.warn('Sync saveSettings fallback:', err);
    });
  },
};

// Rotina de limpeza automática de WhatsApp pessoal apenas do cardápio de demonstração (default_store)
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const demoKey = 'cardapp_settings_default_store';
    const demoData = localStorage.getItem(demoKey);
    if (demoData) {
      try {
        const parsed = JSON.parse(demoData);
        if (parsed.phoneWhatsapp) {
          parsed.phoneWhatsapp = '';
          localStorage.setItem(demoKey, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
    }
  }
} catch {
  // ignore
}

// Start sync immediately
storageService.initFirestoreSync();
