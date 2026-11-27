/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Home, Crown, Lock } from 'lucide-react';
import {
  triggerOrderStatusNotification,
  getStatusNotificationMessage,
  requestPushPermission,
  playNotificationSound,
} from './utils/notificationService';
import {
  Product,
  CartItem,
  Order,
  StoreSettings,
  OrderStatus,
  OrderCustomer,
  SelectedComplement,
  Category,
  UserAccount,
} from './types';
import { storageService } from './services/storageService';
import { accountService } from './services/accountService';
import { Header } from './components/Header';
import { StepTracker } from './components/StepTracker';
import { ProductCard } from './components/ProductCard';
import { ProductCustomizerModal } from './components/ProductCustomizerModal';
import { CartStep } from './components/CartStep';
import { CheckoutStep } from './components/CheckoutStep';
import { OrderTrackingStep } from './components/OrderTrackingStep';
import { CEOAdminModal } from './components/CEOAdminModal';
import { FloatingCartBar } from './components/FloatingCartBar';
import { StoreInfoSidebar } from './components/StoreInfoSidebar';
import { WelcomeSplash } from './components/WelcomeSplash';
import { ForkKnifeIcon } from './components/ForkKnifeIcon';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { SuperAdminModal } from './components/SuperAdminModal';
import { InstagramStoreProfile } from './components/InstagramStoreProfile';
import { PushNotificationBanner } from './components/PushNotificationBanner';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SETTINGS,
} from './data/initialData';
import { testFirestoreConnection } from './firebase';
import { getOrderWhatsAppUrl } from './utils/comandaFormatter';
import { RESERVED_ROUTE_SLUGS, getClientAppUrl } from './utils/constants';
import {
  cacheStoreTargetResolution,
  getCachedStoreTarget,
  saveActiveStoreSession,
  getSavedActiveStoreId,
  saveAppView,
  getSavedAppView,
  saveCeoOpenState,
  getSavedCeoOpenState,
  saveSuperAdminOpenState,
  getSavedSuperAdminOpenState,
  clearAdminModalOpenStates,
  saveClientStep,
  loadClientStep,
  saveClientCart,
  loadClientCart,
  clearClientCart,
  saveClientMenuFilters,
  loadClientMenuFilters,
  saveCustomizerDraft,
  loadCustomizerDraft,
  setExplicitLoginModeOverride,
  saveLoginModalDraft,
  ProductCustomizerDraft,
} from './utils/viewStatePersistence';

function extractStoreTargetFromLocation(): string {
  if (typeof window === 'undefined') return '';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const storeQuery = (urlParams.get('store') || urlParams.get('loja') || '').trim();
    if (storeQuery) return storeQuery;

    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const firstSegment = rawPath.split('/')[0] || '';
    const lowerSeg = firstSegment.toLowerCase();
    if (
      firstSegment &&
      !firstSegment.includes('.') &&
      !RESERVED_ROUTE_SLUGS.has(lowerSeg)
    ) {
      return decodeURIComponent(firstSegment);
    }
  } catch {}
  return '';
}

function resolveInitialStoreIdSync(): string {
  const target = extractStoreTargetFromLocation();
  if (target) {
    const acc = accountService.findAccountByStoreParam(target);
    if (acc?.storeId) return acc.storeId;
    const cached = getCachedStoreTarget(target);
    if (cached?.storeId) return cached.storeId;
  }
  const session = accountService.getCurrentSession();
  const savedCeo = getSavedCeoOpenState();
  const savedSuper = getSavedSuperAdminOpenState();
  if (session?.storeId && (savedCeo === true || savedSuper === true || !target)) {
    return session.storeId;
  }
  return getSavedActiveStoreId();
}

export default function App() {
  const initialResolvedStoreId = useMemo(() => {
    const id = resolveInitialStoreIdSync();
    if (id && id !== 'default_store') {
      storageService.setStoreId(id);
    }
    return id;
  }, []);

  // Navigation view: 'landing' vs 'menu' (Customer shopping screen) vs 'login' (Dedicated login screen)
  const [currentView, setCurrentView] = useState<'landing' | 'menu' | 'login'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';
      const savedNavView = getSavedAppView();
      const savedCeo = getSavedCeoOpenState();
      const savedSuper = getSavedSuperAdminOpenState();
      const session = accountService.getCurrentSession();
      const storeTarget = extractStoreTargetFromLocation();

      // Se CEO ou SuperAdmin já estava com painel aberto nesta aba, mantém no painel ao atualizar
      if (
        (savedCeo === true && session && (session.role === 'store_admin' || accountService.isImpersonating())) ||
        (savedSuper === true && session?.role === 'super_admin')
      ) {
        return 'menu';
      }

      // 1. Rota de login explícita
      if (
        view === 'login' ||
        view === 'entrar' ||
        view === 'cadastro' ||
        view === 'registrar' ||
        view === 'register' ||
        pathname === '/login' ||
        pathname === '/entrar' ||
        pathname === '/cadastro' ||
        pathname === '/registrar' ||
        hash === '#login'
      ) {
        return 'login';
      }

      // 2. Rota de cliente / cardápio / admin explícita OU link direto da loja (/nome-da-loja ou ?store=...)
      if (
        storeTarget ||
        view === 'cliente' ||
        view === 'cardapio' ||
        view === 'menu' ||
        view === 'ceo' ||
        view === 'admin' ||
        pathname === '/cliente' ||
        pathname === '/cardapio' ||
        pathname === '/menu' ||
        pathname === '/ceo' ||
        pathname === '/admin' ||
        hash.includes('cardapio') ||
        hash.includes('admin')
      ) {
        return 'menu';
      }

      // 3. Se o usuário já estava navegando nesta aba e atualizou com F5
      if (savedNavView === 'menu' || savedNavView === 'login' || savedNavView === 'landing') {
        return savedNavView;
      }
    } catch {
      // fallback
    }
    // 4. Ao entrar no site pela primeira vez, sempre entra automaticamente na Landing Page
    return 'landing';
  });

  const [activeStoreId, setActiveStoreId] = useState<string>(initialResolvedStoreId);
  const hydratedStoreRef = useRef<string>(initialResolvedStoreId);

  const [isResolvingStore, setIsResolvingStore] = useState<boolean>(() => {
    const target = extractStoreTargetFromLocation();
    if (!target) return false;
    if (accountService.findAccountByStoreParam(target)) return false;
    return !getCachedStoreTarget(target);
  });
  const [storeResolveError, setStoreResolveError] = useState<string | null>(null);

  // Push Notification Banner state
  const [pushBanner, setPushBanner] = useState<{
    title: string;
    message: string;
    status: OrderStatus;
    deliveryType: 'delivery' | 'retirada' | 'mesa';
    displayId: string;
  } | null>(null);

  const lastActiveOrderStatusRef = React.useRef<OrderStatus | null>(null);

  // Splash Welcome Animation in Yellow & White (only when entering digital menu)
  const [showSplash, setShowSplash] = useState(false);

  // Authentication & Users
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(accountService.getCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');
      if (
        view === 'cadastro' ||
        view === 'registrar' ||
        view === 'register' ||
        pathname === '/cadastro' ||
        pathname === '/registrar'
      ) {
        return 'register';
      }
    } catch {}
    return 'login';
  });
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState<boolean>(() => {
    try {
      const storeTarget = extractStoreTargetFromLocation();
      if (storeTarget) return false;
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const session = accountService.getCurrentSession();
      const savedSuper = getSavedSuperAdminOpenState();
      if (
        session?.role === 'super_admin' &&
        (view === 'ceo' || view === 'admin' || pathname === '/ceo' || pathname === '/admin' || savedSuper === true)
      ) {
        return true;
      }
    } catch {}
    return false;
  });

  // Core Data State
  const [products, setProducts] = useState<Product[]>(() => storageService.getProducts());
  const [orders, setOrders] = useState<Order[]>(() => storageService.getOrders());
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [settings, setSettings] = useState<StoreSettings>(() => storageService.getSettings());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => storageService.getActiveOrderId());

  // 4 Steps for Customer (1: Cardápio, 2: Sacola, 3: Identificação & Entrega, 4: Acompanhamento)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() =>
    loadClientStep(initialResolvedStoreId)
  );

  // Cart State (restaurado por loja ao atualizar a página)
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    loadClientCart(initialResolvedStoreId, storageService.getProducts())
  );

  // Filtering & Search in Menu (Step 1)
  const initialMenuFilters = useMemo(
    () => loadClientMenuFilters(initialResolvedStoreId),
    [initialResolvedStoreId]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(initialMenuFilters.selectedCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialMenuFilters.searchQuery);

  // Modals & Panels
  const [initialCustomizerDraft, setInitialCustomizerDraft] = useState<ProductCustomizerDraft | null>(() =>
    loadCustomizerDraft(initialResolvedStoreId)
  );
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(() => {
    const draft = loadCustomizerDraft(initialResolvedStoreId);
    if (!draft) return null;
    return storageService.getProducts().find((p) => p.id === draft.productId) || null;
  });
  const [isCeoModalOpen, setIsCeoModalOpen] = useState<boolean>(() => {
    try {
      const storeTarget = extractStoreTargetFromLocation();
      if (storeTarget) return false;
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';
      const session = accountService.getCurrentSession();
      const savedCeo = getSavedCeoOpenState();

      if (session && (session.role === 'store_admin' || accountService.isImpersonating())) {
        if (view === 'ceo' || view === 'admin' || pathname === '/ceo' || pathname === '/admin' || hash.includes('admin')) {
          return true;
        }
        if (savedCeo === true) {
          return true;
        }
      }
    } catch {
      // fallback
    }
    return false;
  });
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState<boolean>(initialMenuFilters.isStoreInfoOpen);

  // Sincronizar estado de navegação e UI do cliente em tempo real para sobreviver a refresh (F5)
  useEffect(() => {
    saveAppView(currentView);
  }, [currentView]);

  useEffect(() => {
    if (isResolvingStore || hydratedStoreRef.current !== activeStoreId) return;
    saveClientStep(activeStoreId, currentStep);
  }, [activeStoreId, currentStep, isResolvingStore]);

  useEffect(() => {
    if (isResolvingStore || hydratedStoreRef.current !== activeStoreId) return;
    saveClientCart(activeStoreId, cartItems);
  }, [activeStoreId, cartItems, isResolvingStore]);

  useEffect(() => {
    if (isResolvingStore || hydratedStoreRef.current !== activeStoreId) return;
    saveClientMenuFilters(activeStoreId, {
      selectedCategory,
      searchQuery,
      isStoreInfoOpen,
    });
  }, [activeStoreId, selectedCategory, searchQuery, isStoreInfoOpen, isResolvingStore]);

  useEffect(() => {
    saveCeoOpenState(isCeoModalOpen);
  }, [isCeoModalOpen]);

  useEffect(() => {
    saveSuperAdminOpenState(isSuperAdminModalOpen);
  }, [isSuperAdminModalOpen]);

  const hydrateClientUiForStore = (storeId: string, loadedProducts: Product[]) => {
    const cleanId = storeId || 'default_store';
    hydratedStoreRef.current = cleanId;
    setActiveStoreId(cleanId);
    saveActiveStoreSession(cleanId);
    setCartItems(loadClientCart(cleanId, loadedProducts));
    setCurrentStep(loadClientStep(cleanId));
    const filters = loadClientMenuFilters(cleanId);
    setSelectedCategory(filters.selectedCategory);
    setSearchQuery(filters.searchQuery);
    setIsStoreInfoOpen(filters.isStoreInfoOpen);
    const customDraft = loadCustomizerDraft(cleanId);
    setInitialCustomizerDraft(customDraft);
    if (customDraft) {
      setSelectedProductForModal(loadedProducts.find((p) => p.id === customDraft.productId) || null);
    } else {
      setSelectedProductForModal(null);
    }
  };

  // Check URL query parameters or paths
  useEffect(() => {
    let isMounted = true;

    const syncRouteFromUrl = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');

        const isLogin =
          view === 'login' ||
          view === 'entrar' ||
          pathname === '/login' ||
          pathname === '/entrar';

        const isRegister =
          view === 'cadastro' ||
          view === 'registrar' ||
          view === 'register' ||
          pathname === '/cadastro' ||
          pathname === '/registrar';

        const isCeoRoute =
          view === 'ceo' ||
          view === 'admin' ||
          pathname === '/ceo' ||
          pathname === '/admin' ||
          pathname.startsWith('/admin/');

        const isClienteRoute =
          view === 'cliente' ||
          view === 'cardapio' ||
          view === 'menu' ||
          pathname === '/cliente' ||
          pathname === '/cardapio' ||
          pathname === '/menu';

        const storeTarget = extractStoreTargetFromLocation();
        const session = accountService.getCurrentSession();
        const lastStore = localStorage.getItem('cardapp_last_store_id');

        const savedView = getSavedAppView();
        const savedCeo = getSavedCeoOpenState();
        const savedSuperAdmin = getSavedSuperAdminOpenState();

        // Link compartilhado da loja (/nome-da-loja ou ?store=... / ?loja=...) tem prioridade absoluta para abrir o cardápio do cliente
        if (storeTarget) {
          setCurrentView('menu');
          setIsCeoModalOpen(false);
          setIsSuperAdminModalOpen(false);
          setIsLoginModalOpen(false);
          setStoreResolveError(null);
          saveAppView('menu');

          const localTarget = accountService.findAccountByStoreParam(storeTarget);
          const cachedTarget = !localTarget ? getCachedStoreTarget(storeTarget) : null;
          const quickStoreId = localTarget?.storeId || cachedTarget?.storeId;
          const quickStoreName = localTarget?.storeName || cachedTarget?.storeName;

          if (quickStoreId) {
            storageService.setStoreId(
              quickStoreId,
              quickStoreName,
              localTarget?.phoneWhatsapp
            );
            cacheStoreTargetResolution(storeTarget, quickStoreId, quickStoreName);
            const loadedProds = storageService.getProducts();
            setProducts(loadedProds);
            setOrders(storageService.getOrders());
            setCategories(storageService.getCategories());
            setSettings(storageService.getSettings());
            setActiveOrderId(storageService.getActiveOrderId());
            hydrateClientUiForStore(quickStoreId, loadedProds);
            setIsResolvingStore(false);
            storageService.loadStoreFromFirestoreOnce(quickStoreId).then(() => {
              if (!isMounted) return;
              const syncedProds = storageService.getProducts();
              setProducts(syncedProds);
              setOrders(storageService.getOrders());
              setCategories(storageService.getCategories());
              setSettings(storageService.getSettings());
              setActiveOrderId(storageService.getActiveOrderId());
              setCartItems((prev) =>
                prev.length > 0 ? prev : loadClientCart(quickStoreId, syncedProds)
              );
            });
            return;
          }

          setIsResolvingStore(true);
          const resolveTimer = window.setTimeout(() => {
            if (isMounted) setIsResolvingStore(false);
          }, 3000);

          (async () => {
            try {
              const resolved = await storageService.resolveStoreTarget(storeTarget);
              if (!isMounted) return;

              const resolvedStoreId =
                resolved?.storeId ||
                (storeTarget.startsWith('store_') ? storeTarget : '');

              if (!resolvedStoreId) {
                setStoreResolveError('Loja não encontrada. Verifique o link com o estabelecimento.');
                setIsResolvingStore(false);
                return;
              }

              const hasLocalBefore = Boolean(localStorage.getItem(`cardapp_settings_${resolvedStoreId}`));
              const foundInCloud = await storageService.loadStoreFromFirestoreOnce(resolvedStoreId);
              if (!isMounted) return;

              if (!resolved && !hasLocalBefore && !foundInCloud) {
                setStoreResolveError('Loja não encontrada. Verifique o link com o estabelecimento.');
                setIsResolvingStore(false);
                return;
              }

              storageService.setStoreId(resolvedStoreId, resolved?.storeName);
              cacheStoreTargetResolution(storeTarget, resolvedStoreId, resolved?.storeName);
              const syncedProds = storageService.getProducts();
              setProducts(syncedProds);
              setOrders(storageService.getOrders());
              setCategories(storageService.getCategories());
              setSettings(storageService.getSettings());
              setActiveOrderId(storageService.getActiveOrderId());
              hydrateClientUiForStore(resolvedStoreId, syncedProds);
            } catch {
              // fallback
            } finally {
              window.clearTimeout(resolveTimer);
              if (isMounted) setIsResolvingStore(false);
            }
          })();
          return;
        }

        // Se tentar acessar rota de CEO/Admin sem estar autenticado, redireciona estritamente para o login
        if (isCeoRoute && !session) {
          setIsResolvingStore(false);
          setLoginModalMode('login');
          setCurrentView('login');
          setIsLoginModalOpen(true);
          try {
            window.history.replaceState({}, '', '/?view=login');
          } catch {}
          return;
        }

        // Se o lojista estava com o painel CEO aberto nesta aba (somente se não for link de loja compartilhado)
        if (
          (savedCeo === true && session && (session.role === 'store_admin' || accountService.isImpersonating())) ||
          (isCeoRoute && session && session.role !== 'super_admin')
        ) {
          setIsResolvingStore(false);
          if (session) {
            storageService.setStoreId(session.storeId, session.storeName, session.phoneWhatsapp);
            setActiveStoreId(session.storeId);
            hydratedStoreRef.current = session.storeId;
            saveActiveStoreSession(session.storeId);
            setCurrentUser(session);
            setProducts(storageService.getProducts());
            setOrders(storageService.getOrders());
            setCategories(storageService.getCategories());
            setSettings(storageService.getSettings());
            setActiveOrderId(storageService.getActiveOrderId());
            storageService.loadStoreFromFirestoreOnce(session.storeId).then(() => {
              if (!isMounted) return;
              setProducts(storageService.getProducts());
              setOrders(storageService.getOrders());
              setCategories(storageService.getCategories());
              setSettings(storageService.getSettings());
              setActiveOrderId(storageService.getActiveOrderId());
            });
          }
          setCurrentView('menu');
          setIsSuperAdminModalOpen(false);
          setIsCeoModalOpen(true);
          return;
        }

        // Se o SuperAdmin estava com o painel aberto nesta aba
        if (session && session.role === 'super_admin' && (isCeoRoute || savedSuperAdmin === true)) {
          setIsResolvingStore(false);
          storageService.setStoreId(session.storeId, session.storeName, session.phoneWhatsapp);
          setActiveStoreId(session.storeId);
          hydratedStoreRef.current = session.storeId;
          saveActiveStoreSession(session.storeId);
          setCurrentUser(session);
          setCurrentView('menu');
          setIsCeoModalOpen(false);
          setIsSuperAdminModalOpen(true);
          return;
        }

        // Rotas explícitas de login e cadastro têm prioridade quando nenhum painel está aberto
        if (isRegister) {
          setIsResolvingStore(false);
          setLoginModalMode('register');
          setCurrentView('login');
          setIsLoginModalOpen(true);
          return;
        }
        if (isLogin) {
          setIsResolvingStore(false);
          setLoginModalMode('login');
          setCurrentView('login');
          setIsLoginModalOpen(true);
          return;
        }

        // Sem loja específica na URL: página inicial (Landing) na primeira visita
        if (!view && (!pathname || pathname === '/') && !window.location.hash && !savedView) {
          setIsResolvingStore(false);
          setCurrentView('landing');
          setIsCeoModalOpen(false);
          setIsSuperAdminModalOpen(false);
          saveAppView('landing');
          return;
        }

        if (savedView === 'login') {
          setIsResolvingStore(false);
          setCurrentView('login');
          setIsLoginModalOpen(true);
          return;
        } else if (isClienteRoute || view === 'cardapio' || view === 'menu' || savedView === 'menu') {
          setIsResolvingStore(false);
          const targetId = lastStore || 'default_store';
          storageService.setStoreId(targetId);
          const prods = storageService.getProducts();
          setProducts(prods);
          setOrders(storageService.getOrders());
          setCategories(storageService.getCategories());
          setSettings(storageService.getSettings());
          setActiveOrderId(storageService.getActiveOrderId());
          hydrateClientUiForStore(targetId, prods);
          setCurrentView('menu');
          return;
        } else if (savedView === 'landing') {
          setIsResolvingStore(false);
          setCurrentView('landing');
          return;
        } else {
          setIsResolvingStore(false);
          setCurrentView('landing');
          saveAppView('landing');
        }
      } catch {
        setIsResolvingStore(false);
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => {
      isMounted = false;
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, []);

  // Load initial data and subscribe to storage changes
  useEffect(() => {
    testFirestoreConnection();
    const initialSession = accountService.getCurrentSession();
    const urlStoreTarget = extractStoreTargetFromLocation();
    storageService.setAuthContext(
      accountService.isImpersonating() ? 'super_admin' : (initialSession?.role || null),
      initialSession?.storeId || null
    );
    if (initialSession && initialSession.storeId && !urlStoreTarget) {
      storageService.setStoreId(initialSession.storeId, initialSession.storeName, initialSession.phoneWhatsapp);
    }

    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    const storedActiveId = storageService.getActiveOrderId();
    if (storedActiveId) {
      setActiveOrderId(storedActiveId);
    }

    const unsubscribeStorage = storageService.subscribe(() => {
      const newOrders = storageService.getOrders();
      if (newOrders.length > ordersRef.current.length) {
        try {
          playNotificationSound();
        } catch {}
      } else {
        const hasStatusChange = newOrders.some((newO) => {
          const oldO = ordersRef.current.find((o) => o.id === newO.id);
          return oldO && oldO.status !== newO.status;
        });
        if (hasStatusChange) {
          try {
            playNotificationSound();
          } catch {}
        }
      }

      setProducts(storageService.getProducts());
      setOrders(newOrders);
      setCategories(storageService.getCategories());
      setSettings(storageService.getSettings());
      setActiveOrderId(storageService.getActiveOrderId());
    });

    const unsubscribeAuth = accountService.subscribe(() => {
      const sess = accountService.getCurrentSession();
      setCurrentUser(sess);
      storageService.setAuthContext(
        accountService.isImpersonating() ? 'super_admin' : (sess?.role || null),
        sess?.storeId || null
      );
      if (sess && sess.storeId && !extractStoreTargetFromLocation()) {
        storageService.setStoreId(sess.storeId, sess.storeName, sess.phoneWhatsapp);
      }
    });

    return () => {
      unsubscribeStorage();
      unsubscribeAuth();
    };
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCategory =
        selectedCategory === 'todos' || prod.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const totalCartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  // Client Orders on this device/session (permite fazer múltiplos pedidos sem limitação)
  const clientOrderIds = useMemo(() => {
    return storageService.getClientOrderIds();
  }, [orders]);

  const clientOrders = useMemo(() => {
    if (clientOrderIds.length > 0) {
      const filtered = orders.filter((o) => clientOrderIds.includes(o.id));
      if (filtered.length > 0) return filtered;
    }
    return orders;
  }, [orders, clientOrderIds]);

  // Active/Tracked Order for Step 4 (keeps the tracked order visible when finalized so customer receives live "Entregue" update)
  const currentActiveOrder = useMemo(() => {
    if (activeOrderId) {
      const found = orders.find((o) => o.id === activeOrderId);
      if (found) return found;
    }
    const unfinishedClient = clientOrders.find((o) => o.status !== 'finalizado');
    if (unfinishedClient) return unfinishedClient;
    const unfinishedAll = orders.find((o) => o.status !== 'finalizado');
    return unfinishedAll || null;
  }, [orders, activeOrderId, clientOrders]);

  // Listen for real-time order status updates to trigger Push Notifications & Sound
  useEffect(() => {
    if (!currentActiveOrder) {
      lastActiveOrderStatusRef.current = null;
      return;
    }

    // Initialize ref on first run
    if (!lastActiveOrderStatusRef.current) {
      lastActiveOrderStatusRef.current = currentActiveOrder.status;
      return;
    }

    // If status changed (e.g., CEO updated status)
    if (lastActiveOrderStatusRef.current !== currentActiveOrder.status) {
      lastActiveOrderStatusRef.current = currentActiveOrder.status;

      // Dispara push notification nativa do navegador + som de alerta
      triggerOrderStatusNotification(currentActiveOrder, currentActiveOrder.status);

      // Exibe banner flutuante em tempo real no topo da tela
      const { title, message } = getStatusNotificationMessage(
        currentActiveOrder,
        currentActiveOrder.status
      );

      setPushBanner({
        title,
        message,
        status: currentActiveOrder.status,
        deliveryType: currentActiveOrder.customer.deliveryType,
        displayId: currentActiveOrder.displayId,
      });
    }
  }, [currentActiveOrder]);

  // Unfinished orders count for CEO notification badge
  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status !== 'finalizado').length;
  }, [orders]);

  // Quick Add / Customizer Add to Cart with Complements and Promotion
  const handleAddToCart = (
    product: Product,
    quantityToAdd: number,
    notes?: string,
    selectedComplements?: SelectedComplement[],
    appliedPromotion?: { promoQuantity: number; promoPrice: number; savings: number },
    totalPriceParam?: number
  ) => {
    const compTotal = (selectedComplements || []).reduce((acc, c) => acc + c.price, 0) * quantityToAdd;
    let basePrice = product.price * quantityToAdd;

    if (product.promotion?.enabled && quantityToAdd >= product.promotion.promoQuantity) {
      const bundles = Math.floor(quantityToAdd / product.promotion.promoQuantity);
      const rem = quantityToAdd % product.promotion.promoQuantity;
      basePrice = bundles * product.promotion.promoPrice + rem * product.price;
    }

    const calculatedTotal = totalPriceParam !== undefined ? totalPriceParam : basePrice + compTotal;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          JSON.stringify(item.selectedComplements || []) === JSON.stringify(selectedComplements || [])
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantityToAdd;
        let newBase = product.price * newQty;
        let newPromoData = undefined;

        if (product.promotion?.enabled && newQty >= product.promotion.promoQuantity) {
          const b = Math.floor(newQty / product.promotion.promoQuantity);
          const r = newQty % product.promotion.promoQuantity;
          const bundled = b * product.promotion.promoPrice + r * product.price;
          const savings = newBase - bundled;
          if (savings > 0) {
            newBase = bundled;
            newPromoData = {
              promoQuantity: product.promotion.promoQuantity,
              promoPrice: product.promotion.promoPrice,
              savings,
            };
          }
        }

        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          notes: notes !== undefined ? notes : updated[existingIndex].notes,
          appliedPromotion: newPromoData || appliedPromotion,
          totalPrice: newBase + (selectedComplements || []).reduce((acc, c) => acc + c.price, 0) * newQty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity: quantityToAdd,
          notes,
          selectedComplements,
          appliedPromotion,
          totalPrice: calculatedTotal,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    setCartItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) => {
        if (item.product.id === productId) {
          const compsUnit = (item.selectedComplements || []).reduce((acc, c) => acc + c.price, 0);
          let base = item.product.price * newQuantity;
          let promoData = undefined;
          if (item.product.promotion?.enabled && newQuantity >= item.product.promotion.promoQuantity) {
            const b = Math.floor(newQuantity / item.product.promotion.promoQuantity);
            const r = newQuantity % item.product.promotion.promoQuantity;
            const bundled = b * item.product.promotion.promoPrice + r * item.product.price;
            const savings = base - bundled;
            if (savings > 0) {
              base = bundled;
              promoData = {
                promoQuantity: item.product.promotion.promoQuantity,
                promoPrice: item.product.promotion.promoPrice,
                savings,
              };
            }
          }
          return {
            ...item,
            quantity: newQuantity,
            appliedPromotion: promoData,
            totalPrice: base + compsUnit * newQuantity,
          };
        }
        return item;
      });
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Submit Order from Step 3
  const handleSubmitOrder = (customerData: OrderCustomer) => {
    let deliveryFee = 0;
    if (customerData.deliveryType === 'delivery') {
      deliveryFee = settings.deliveryFee;
      if (customerData.address?.neighborhood && settings.deliveryNeighborhoods?.length) {
        const cleanB = customerData.address.neighborhood.trim().toLowerCase();
        const cleanC = customerData.address.city.trim().toLowerCase();
        const found =
          settings.deliveryNeighborhoods.find(
            (n) =>
              n.neighborhood.toLowerCase().trim() === cleanB &&
              (!cleanC || n.city.toLowerCase().trim() === cleanC)
          ) ||
          settings.deliveryNeighborhoods.find(
            (n) => n.neighborhood.toLowerCase().trim() === cleanB
          );
        if (found) {
          deliveryFee = found.fee;
        }
      }
    }
    const total = cartSubtotal + deliveryFee;

    const newOrder = storageService.createOrder({
      items: cartItems,
      subtotal: cartSubtotal,
      deliveryFee,
      total,
      customer: customerData,
    });

    const latestSettings = settings.phoneWhatsapp ? settings : storageService.getSettings();
    const fallbackAccountPhone = !latestSettings.phoneWhatsapp
      ? accountService.findAccountByStoreParam(storageService.currentStoreId)?.phoneWhatsapp || ''
      : '';
    const effectiveSettingsForWhatsApp = fallbackAccountPhone
      ? { ...latestSettings, phoneWhatsapp: fallbackAccountPhone }
      : latestSettings;

    // Solicita permissão para notificações push no navegador para avisar quando o CEO atualizar
    try {
      requestPushPermission();
    } catch {
      // ignore
    }

    lastActiveOrderStatusRef.current = 'recebido';
    clearClientCart(activeStoreId);
    saveClientStep(activeStoreId, 4);
    setOrders(storageService.getOrders());
    setCartItems([]);
    setActiveOrderId(newOrder.id);
    setCurrentStep(4);

    // Envia automaticamente a comanda digitada completa para o WhatsApp da loja
    if (effectiveSettingsForWhatsApp.phoneWhatsapp) {
      try {
        const whatsappUrl = getOrderWhatsAppUrl(newOrder, effectiveSettingsForWhatsApp);
        if (whatsappUrl) {
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          const isMobileDevice =
            typeof navigator !== 'undefined' &&
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

          if (!isInIframe && isMobileDevice) {
            window.location.assign(whatsappUrl);
          } else {
            const a = document.createElement('a');
            a.href = whatsappUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }
      } catch {
        // fallback
      }
    }
  };

  // CEO Actions
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    storageService.updateOrderStatus(orderId, newStatus);
    setOrders(storageService.getOrders());
  };

  const handleDeleteOrder = (orderId: string) => {
    storageService.deleteOrder(orderId);
  };

  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    storageService.addProduct(newProd);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    storageService.updateProduct(updatedProd);
  };

  const handleDeleteProduct = (productId: string) => {
    storageService.deleteProduct(productId);
  };

  const handleAddCategory = (name: string) => {
    storageService.addCategory(name);
    setCategories(storageService.getCategories());
  };

  const handleDeleteCategory = (catId: string) => {
    storageService.deleteCategory(catId);
    setCategories(storageService.getCategories());
    if (selectedCategory === catId) {
      setSelectedCategory('todos');
    }
  };

  const handleSaveSettings = (newSettings: StoreSettings) => {
    storageService.saveSettings(newSettings);
  };

  // Navigation handlers
  const handleOpenDemoMenu = () => {
    clearAdminModalOpenStates();
    storageService.setAuthContext(null, 'default_store');
    storageService.setStoreId('default_store');
    const demoSettings: StoreSettings = {
      ...INITIAL_SETTINGS,
      phoneWhatsapp: '',
    };
    localStorage.setItem(storageService.getProductsKey(), JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(storageService.getCategoriesKey(), JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(storageService.getSettingsKey(), JSON.stringify(demoSettings));
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setSettings(demoSettings);
    setCurrentUser(null);
    hydratedStoreRef.current = 'default_store';
    setActiveStoreId('default_store');
    saveActiveStoreSession('default_store');
    setCartItems(loadClientCart('default_store', INITIAL_PRODUCTS));
    setCurrentStep(1);
    saveClientStep('default_store', 1);
    setCurrentView('menu');
    setShowSplash(true);
    localStorage.setItem('cardapp_last_view', 'menu');
    try {
      window.history.replaceState({}, '', '/?view=cardapio');
    } catch {
      // ignore
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    accountService.switchSession(user);
    storageService.setAuthContext(user.role, user.storeId);
    storageService.setStoreId(user.storeId, user.storeName, user.phoneWhatsapp);
    saveActiveStoreSession(user.storeId);
    hydratedStoreRef.current = user.storeId;
    setActiveStoreId(user.storeId);
    setCurrentUser(user);
    setCartItems([]);
    clearClientCart(user.storeId);
    setActiveOrderId(null);
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    setIsLoginModalOpen(false);

    if (user.role === 'super_admin') {
      saveSuperAdminOpenState(true);
      setIsSuperAdminModalOpen(true);
      setIsCeoModalOpen(false);
      setCurrentView('menu');
      try {
        window.history.replaceState({}, '', '/?view=admin');
      } catch {
        // ignore
      }
    } else {
      saveCeoOpenState(true);
      setIsCeoModalOpen(true);
      setIsSuperAdminModalOpen(false);
      setCurrentView('menu');
      try {
        window.history.replaceState({}, '', '/?view=ceo');
      } catch {
        // ignore
      }
    }
  };

  const handleEnterUserAccount = (targetAcc: UserAccount) => {
    const res = accountService.impersonateAccount(targetAcc.id);
    if (!res.success || !res.user) return;
    const targetUser = res.user;
    storageService.setAuthContext('super_admin', targetUser.storeId);
    storageService.setStoreId(targetUser.storeId, targetUser.storeName, targetUser.phoneWhatsapp);
    saveActiveStoreSession(targetUser.storeId);
    hydratedStoreRef.current = targetUser.storeId;
    setActiveStoreId(targetUser.storeId);
    setCurrentUser(targetUser);
    setCartItems([]);
    setActiveOrderId(null);
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    saveCeoOpenState(true);
    setIsSuperAdminModalOpen(false);
    setIsCeoModalOpen(true);
    setCurrentView('menu');
  };

  const handleReturnToSuperAdmin = () => {
    const res = accountService.returnToSuperAdmin();
    if (!res.success || !res.user) return;
    const adminUser = res.user;
    storageService.setAuthContext('super_admin', adminUser.storeId);
    storageService.setStoreId(adminUser.storeId, adminUser.storeName, adminUser.phoneWhatsapp);
    saveActiveStoreSession(adminUser.storeId);
    hydratedStoreRef.current = adminUser.storeId;
    setActiveStoreId(adminUser.storeId);
    setCurrentUser(adminUser);
    setCartItems([]);
    setActiveOrderId(null);
    saveSuperAdminOpenState(true);
    setIsCeoModalOpen(false);
    setIsSuperAdminModalOpen(true);
    setCurrentView('menu');
    try {
      window.history.replaceState({}, '', '/?view=admin');
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    accountService.logout();
    clearAdminModalOpenStates();
    saveLoginModalDraft(null);
    setExplicitLoginModeOverride('login');
    storageService.setAuthContext(null, 'default_store');
    setCurrentUser(null);
    localStorage.removeItem('cardapp_last_view');
    localStorage.removeItem('cardapp_last_store_id');
    storageService.setStoreId('default_store');
    hydratedStoreRef.current = 'default_store';
    setActiveStoreId('default_store');
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    setCartItems([]);
    setActiveOrderId(null);
    setIsSuperAdminModalOpen(false);
    setIsCeoModalOpen(false);
    setCurrentView('login');
    setIsLoginModalOpen(true);
    try {
      window.history.replaceState({}, '', '/?view=login');
    } catch {
      // ignore
    }
  };

  const handleStartNewOrder = () => {
    if (currentActiveOrder?.status === 'finalizado') {
      storageService.clearActiveOrderId();
      setActiveOrderId(null);
    }
    clearClientCart(activeStoreId);
    setCartItems([]);
    saveClientStep(activeStoreId, 1);
    setCurrentStep(1);
  };

  const handleGoToLanding = () => {
    clearAdminModalOpenStates();
    setIsCeoModalOpen(false);
    setIsSuperAdminModalOpen(false);
    setCurrentView('landing');
    localStorage.removeItem('cardapp_last_view');
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // ignore
    }
  };

  const handleNavigateToLogin = (mode: 'login' | 'register') => {
    clearAdminModalOpenStates();
    setExplicitLoginModeOverride(mode);
    setLoginModalMode(mode);
    setCurrentView('login');
    setIsLoginModalOpen(true);
    try {
      window.history.pushState({}, '', mode === 'register' ? '/?view=cadastro' : '/?view=login');
    } catch {
      // ignore
    }
  };

  return (
    <div className="cardapp-rendered-app min-h-screen bg-[#FFFDF7] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Real-time Push Notification Banner (Triggered when CEO updates status) */}
      {pushBanner && (
        <PushNotificationBanner
          title={pushBanner.title}
          message={pushBanner.message}
          status={pushBanner.status}
          deliveryType={pushBanner.deliveryType}
          displayId={pushBanner.displayId}
          onClose={() => setPushBanner(null)}
          onViewOrder={() => {
            setPushBanner(null);
            setCurrentView('menu');
            setCurrentStep(4);
          }}
        />
      )}

      {/* 1. SAAS LANDING PAGE (PLANO A PARTIR DE R$ 2,00/MÊS E ALTA CONVERSÃO) */}
      {currentView === 'landing' && (
        <LandingPage
          onOpenLogin={() => handleNavigateToLogin('login')}
          onOpenRegister={() => handleNavigateToLogin('register')}
          onOpenDemoMenu={handleOpenDemoMenu}
        />
      )}

      {/* Fallback caso currentView esteja em algum valor não reconhecido */}
      {currentView !== 'landing' && currentView !== 'login' && currentView !== 'menu' && (
        <LandingPage
          onOpenLogin={() => handleNavigateToLogin('login')}
          onOpenRegister={() => handleNavigateToLogin('register')}
          onOpenDemoMenu={handleOpenDemoMenu}
        />
      )}

      {/* 2. DEDICATED LOGIN SCREEN (STANDALONE, SEM LANDING PAGE ATRÁS, SEM SETAS OU "X") */}
      {currentView === 'login' && (
        <LoginModal
          isOpen={true}
          isStandalone={true}
          initialMode={loginModalMode}
          onLoginSuccess={handleLoginSuccess}
          onClose={() => {
            saveLoginModalDraft(null);
            setCurrentView('landing');
            try {
              window.history.pushState({}, '', '/');
            } catch {
              // ignore
            }
          }}
        />
      )}

      {/* 3. DIGITAL MENU VIEW FOR CLIENTS (SOMENTE COMPRAS DO CLIENTE, SEM SETAS OU "X" PARA O LANDING PAGE) */}
      {currentView === 'menu' && isResolvingStore && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FFFDF7]">
          <div className="w-16 h-16 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg mb-4 animate-pulse">
            <ForkKnifeIcon className="w-8 h-8 stroke-[2.3]" />
          </div>
          <h2 className="text-lg font-black text-slate-950">Carregando cardápio da loja...</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">Buscando produtos e informações atualizadas</p>
          <button
            type="button"
            onClick={() => setIsResolvingStore(false)}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-md"
          >
            Entrar no Cardápio Agora
          </button>
        </div>
      )}

      {currentView === 'menu' && !isResolvingStore && storeResolveError && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FFFDF7]">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ForkKnifeIcon className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h2 className="text-lg font-black text-slate-950">Loja não encontrada</h2>
            <p className="text-xs text-slate-600">{storeResolveError}</p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenDemoMenu}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                Ver Cardápio Demonstração
              </button>
              <button
                type="button"
                onClick={handleGoToLanding}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Página Inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'menu' && !isResolvingStore && !storeResolveError && (
        <>
          {/* Welcome Splash Animation in Yellow & White */}
          {showSplash && (
            <WelcomeSplash
              storeName={settings.storeName}
              logoBase64={settings.logoBase64}
              onFinish={() => setShowSplash(false)}
            />
          )}

          {/* Top Header - OPÇÕES DO CLIENTE & ACESSO AO PAINEL DO CEO (APENAS PARA O DONO) */}
          <Header
            settings={settings}
            cartCount={totalCartCount}
            onOpenCart={() => setCurrentStep(2)}
            onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
            onViewMenuClick={() => setCurrentStep(1)}
            hasActiveOrder={Boolean(currentActiveOrder && currentActiveOrder.status !== 'finalizado')}
            activeOrderStatus={currentActiveOrder?.status}
            activeOrderDisplayId={currentActiveOrder?.displayId}
            customerOrdersCount={clientOrders.length}
            onViewTracking={() => setCurrentStep(4)}
            onGoToLanding={handleGoToLanding}
            showCeoControls={!extractStoreTargetFromLocation() && Boolean(
              currentUser &&
              (currentUser.role === 'super_admin' || currentUser.storeId === activeStoreId || accountService.isImpersonating())
            )}
            onOpenCeoMenu={() => {
              setIsCeoModalOpen(true);
            }}
          />

          {/* Banner de Acesso Rápido ao Painel do Administrador / CEO (Exibido Apenas para o Dono da Loja em modo gestão, NUNCA no link compartilhado do cliente) */}
          {!extractStoreTargetFromLocation() && Boolean(
            currentUser &&
            (currentUser.role === 'super_admin' || currentUser.storeId === activeStoreId || accountService.isImpersonating())
          ) && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 text-xs font-black shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Painel de Gestão da Loja: Você pode gerenciar pedidos, produtos, taxa de entrega e QR Code a qualquer momento.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCeoModalOpen(true)}
                className="px-4 py-1.5 rounded-xl bg-slate-950 text-amber-300 hover:bg-slate-900 transition-all shadow-xs cursor-pointer text-[11px] uppercase tracking-wider shrink-0"
              >
                ⚙️ Abrir Painel do CEO / Admin
              </button>
            </div>
          )}

          {/* 4 ETAPAS TRACKER FOR CLIENT */}
          <StepTracker
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
            cartCount={totalCartCount}
            hasActiveOrder={Boolean(currentActiveOrder) || clientOrders.length > 0}
          />

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 pb-24">
            {/* ETAPA 1: CARDÁPIO (SELEÇÃO DE PRODUTOS) */}
            {currentStep === 1 && (
              <div>
                {/* Perfil Oficial da Loja Centralizado e Elegante */}
                <InstagramStoreProfile settings={settings} />

                {/* Sticky Search and Category Filters */}
                <section className="max-w-5xl mx-auto px-4 pt-4 pb-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar itens no cardápio..."
                        className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-2xl bg-white border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all shadow-xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Scroll Category Filter */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('todos')}
                      className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        selectedCategory === 'todos'
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80'
                      }`}
                    >
                      Todos os Itens (Consumir no local)
                    </button>

                    {categories.map((cat) => {
                      const count = products.filter((p) => p.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            selectedCategory === cat.id
                              ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80'
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Product Cards Grid */}
                <section className="max-w-5xl mx-auto px-4 py-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-amber-300 p-8">
                      <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                        <ForkKnifeIcon className="w-8 h-8 text-amber-500 stroke-[2.2]" />
                      </div>
                      <h3 className="font-bold text-base text-slate-900">Nenhum produto encontrado</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Tente buscar com outras palavras ou selecione outra categoria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('todos');
                          setSearchQuery('');
                        }}
                        className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        Ver todos os produtos
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                      {filteredProducts.map((product) => {
                        const existingInCart = cartItems.find((item) => item.product.id === product.id);
                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            quantityInCart={existingInCart ? existingInCart.quantity : 0}
                            onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
                            onUpdateQuantity={(prod, qty) => handleUpdateCartQuantity(prod.id, qty)}
                            onOpenDetails={(prod) => setSelectedProductForModal(prod)}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ETAPA 2: SACOLA (REVISÃO DO PEDIDO) */}
            {currentStep === 2 && (
              <CartStep
                items={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onBackToMenu={() => setCurrentStep(1)}
                onProceedToCheckout={() => setCurrentStep(3)}
                settings={settings}
              />
            )}

            {/* ETAPA 3: IDENTIFICAÇÃO & ENTREGA / CHECKOUT */}
            {currentStep === 3 && (
              <CheckoutStep
                items={cartItems}
                settings={settings}
                storeId={activeStoreId}
                onBackToCart={() => setCurrentStep(2)}
                onSubmitOrder={handleSubmitOrder}
              />
            )}

            {/* ETAPA 4: ACOMPANHAMENTO DO PEDIDO EM TEMPO REAL */}
            {currentStep === 4 && (
              <OrderTrackingStep
                order={currentActiveOrder}
                allOrders={clientOrders}
                onSelectOrder={(id) => {
                  setActiveOrderId(id);
                  storageService.setActiveOrderId(id);
                }}
                settings={settings}
                onNewOrder={handleStartNewOrder}
              />
            )}
          </main>

          {/* Centered Footer with SF TECNOLOGIA & Discreet Lower Quick Access */}
          <footer className="py-6 px-4 text-center text-xs text-slate-500 border-t border-amber-200/60 bg-white/60">
            <div className="max-w-md mx-auto space-y-1">
              <p className="font-extrabold text-slate-800 font-display">
                CARD<span className="text-amber-500">APP</span> • {settings.storeName}
              </p>
              <p className="text-[11px] text-amber-800 font-bold tracking-wide uppercase">
                Desenvolvido por SF TECNOLOGIA
              </p>
              <p className="text-[10px] text-slate-400">
                © {new Date().getFullYear()} • Todos os direitos reservados
              </p>

              {/* Discreet Lower Quick Access for CEO / Landing / Login (Apenas quando não for link de loja compartilhado) */}
              {!extractStoreTargetFromLocation() && (
                <div className="pt-3 flex items-center justify-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={handleGoToLanding}
                    className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Voltar para a Landing Page Oficial"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Landing Page</span>
                  </button>

                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleNavigateToLogin('login')}
                    className="text-slate-500 hover:text-slate-800 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Ir para a aba de Login"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Entrar / Login</span>
                  </button>
                </div>
              )}
            </div>
          </footer>

          {/* Sticky Floating Cart Bar on Step 1 when items exist */}
          {currentStep === 1 && totalCartCount > 0 && (
            <FloatingCartBar
              totalItems={totalCartCount}
              subtotal={cartSubtotal}
              onOpenCart={() => setCurrentStep(2)}
            />
          )}
        </>
      )}

      {/* PRODUCT CUSTOMIZER MODAL */}
      <ProductCustomizerModal
        product={selectedProductForModal}
        initialQuantity={
          selectedProductForModal && initialCustomizerDraft?.productId === selectedProductForModal.id
            ? initialCustomizerDraft.quantity
            : 1
        }
        initialNotes={
          selectedProductForModal && initialCustomizerDraft?.productId === selectedProductForModal.id
            ? initialCustomizerDraft.notes
            : ''
        }
        initialComplements={
          selectedProductForModal && initialCustomizerDraft?.productId === selectedProductForModal.id
            ? initialCustomizerDraft.selectedComplements
            : []
        }
        onDraftChange={(draft) => {
          setInitialCustomizerDraft(draft);
          saveCustomizerDraft(activeStoreId, draft);
        }}
        onClose={() => {
          setSelectedProductForModal(null);
          setInitialCustomizerDraft(null);
          saveCustomizerDraft(activeStoreId, null);
        }}
        onConfirm={handleAddToCart}
      />

      {/* STORE INFO SIDEBAR (TOP-LEFT DRAWER) */}
      <StoreInfoSidebar
        isOpen={isStoreInfoOpen}
        onClose={() => setIsStoreInfoOpen(false)}
        settings={settings}
      />

      {/* CEO / STORE OWNER ADMIN MODAL */}
      {isCeoModalOpen && (
        <CEOAdminModal
          key={`${currentUser?.storeId || 'default'}_${currentUser?.id || 'guest'}`}
          isOpen={true}
          onClose={() => {
            saveCeoOpenState(false);
            setIsCeoModalOpen(false);
            localStorage.setItem('cardapp_last_view', 'menu');
          }}
          products={products}
          orders={orders}
          categories={categories}
          settings={settings}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onSaveSettings={handleSaveSettings}
          onSwitchToClientView={() => {
            saveCeoOpenState(false);
            setIsCeoModalOpen(false);
            setCurrentView('menu');
            localStorage.setItem('cardapp_last_view', 'menu');
          }}
          onLogout={handleLogout}
          isAdminImpersonating={accountService.isImpersonating()}
          onReturnToSuperAdmin={handleReturnToSuperAdmin}
        />
      )}

      {/* SUPER ADMIN MODAL (SAMUEL_ADM1 - GERADOR DE CONTAS E BANCO DE DADOS) */}
      {currentUser && currentUser.role === 'super_admin' && (
        <SuperAdminModal
          isOpen={isSuperAdminModalOpen}
          onClose={() => {
            saveSuperAdminOpenState(false);
            setIsSuperAdminModalOpen(false);
            localStorage.setItem('cardapp_last_view', 'menu');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onEnterUserAccount={handleEnterUserAccount}
        />
      )}

      {/* LOGIN MODAL (Renderizado apenas se invocado como overlay) */}
      {isLoginModalOpen && currentView !== 'login' && (
        <LoginModal
          isOpen={true}
          isStandalone={false}
          initialMode={loginModalMode}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
