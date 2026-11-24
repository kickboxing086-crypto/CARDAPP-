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

export default function App() {
  // Navigation view: 'landing' vs 'menu' (Customer shopping screen) vs 'login' (Dedicated login screen)
  const [currentView, setCurrentView] = useState<'landing' | 'menu' | 'login'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';
      const savedNavView = typeof window !== 'undefined' ? sessionStorage.getItem('cardapp_current_view') : null;
      const storeTarget = extractStoreTargetFromLocation();

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
      if (savedNavView === 'menu') {
        return 'menu';
      }
      if (savedNavView === 'login') {
        return 'login';
      }
      if (savedNavView === 'landing') {
        return 'landing';
      }
    } catch {
      // fallback
    }
    // 4. Ao entrar no site pela primeira vez, sempre entra automaticamente na Landing Page
    return 'landing';
  });

  const [isResolvingStore, setIsResolvingStore] = useState<boolean>(() => {
    const target = extractStoreTargetFromLocation();
    if (!target) return false;
    return !accountService.findAccountByStoreParam(target);
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
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login');
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(storageService.getSettings());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(storageService.getActiveOrderId());

  // 4 Steps for Customer (1: Cardápio, 2: Sacola, 3: Identificação & Entrega, 4: Acompanhamento)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const saved = sessionStorage.getItem('cardapp_current_step');
      if (saved && ['1', '2', '3', '4'].includes(saved)) {
        return Number(saved) as 1 | 2 | 3 | 4;
      }
    } catch {}
    return 1;
  });

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Filtering & Search in Menu (Step 1)
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Panels
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCeoModalOpen, setIsCeoModalOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';
      const savedCeo = typeof window !== 'undefined' ? sessionStorage.getItem('cardapp_ceo_open') : null;
      const savedNavView = typeof window !== 'undefined' ? sessionStorage.getItem('cardapp_current_view') : null;

      if (view === 'ceo' || view === 'admin' || pathname === '/ceo' || pathname === '/admin' || hash.includes('admin')) {
        return true;
      }
      if (savedCeo === 'true' && (savedNavView === 'menu' || view === 'cliente')) {
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  });
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);

  // Sincronizar sessionStorage em tempo real para que ao atualizar (F5) não saia da aba onde está
  useEffect(() => {
    try {
      sessionStorage.setItem('cardapp_current_view', currentView);
    } catch {}
  }, [currentView]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cardapp_current_step', String(currentStep));
    } catch {}
  }, [currentStep]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cardapp_ceo_open', isCeoModalOpen ? 'true' : 'false');
    } catch {}
  }, [isCeoModalOpen]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cardapp_superadmin_open', isSuperAdminModalOpen ? 'true' : 'false');
    } catch {}
  }, [isSuperAdminModalOpen]);

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

        const savedView = sessionStorage.getItem('cardapp_current_view');
        const savedCeo = sessionStorage.getItem('cardapp_ceo_open');
        const savedSuperAdmin = sessionStorage.getItem('cardapp_superadmin_open');

        // Rotas explícitas de login e cadastro têm prioridade
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

        // Se o lojista acessou rota admin/ceo ou estava com painel CEO aberto
        if (isCeoRoute || (savedCeo === 'true' && session?.role === 'store_admin')) {
          setIsResolvingStore(false);
          if (session) {
            storageService.setStoreId(session.storeId, session.storeName, session.phoneWhatsapp);
            setCurrentUser(session);
          }
          setCurrentView('menu');
          setIsCeoModalOpen(true);
          return;
        }

        // Se o SuperAdmin estava com o painel aberto
        if (session && session.role === 'super_admin' && (isCeoRoute || savedSuperAdmin === 'true')) {
          setIsResolvingStore(false);
          storageService.setStoreId(session.storeId, session.storeName, session.phoneWhatsapp);
          setCurrentUser(session);
          setCurrentView('menu');
          setIsSuperAdminModalOpen(true);
          return;
        }

        // Link compartilhado da loja (/nome-da-loja ou ?store=... / ?loja=...)
        if (storeTarget) {
          setCurrentView('menu');
          setIsCeoModalOpen(false);
          setIsSuperAdminModalOpen(false);
          setStoreResolveError(null);
          sessionStorage.setItem('cardapp_current_view', 'menu');

          const localTarget = accountService.findAccountByStoreParam(storeTarget);
          if (localTarget) {
            storageService.setStoreId(
              localTarget.storeId,
              localTarget.storeName,
              localTarget.phoneWhatsapp
            );
            localStorage.setItem('cardapp_last_store_id', localTarget.storeId);
            setProducts(storageService.getProducts());
            setCategories(storageService.getCategories());
            setSettings(storageService.getSettings());
            setIsResolvingStore(false);
            storageService.loadStoreFromFirestoreOnce(localTarget.storeId).then(() => {
              if (!isMounted) return;
              setProducts(storageService.getProducts());
              setCategories(storageService.getCategories());
              setSettings(storageService.getSettings());
            });
            return;
          }

          setIsResolvingStore(true);
          (async () => {
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

            storageService.setStoreId(resolvedStoreId, resolved?.storeName);
            localStorage.setItem('cardapp_last_store_id', resolvedStoreId);
            await storageService.loadStoreFromFirestoreOnce(resolvedStoreId);
            if (!isMounted) return;

            setProducts(storageService.getProducts());
            setCategories(storageService.getCategories());
            setSettings(storageService.getSettings());
            setIsResolvingStore(false);
          })();
          return;
        }

        // Sem loja específica na URL: página inicial (Landing) na primeira visita
        if (!view && (!pathname || pathname === '/') && !window.location.hash && !savedView) {
          setIsResolvingStore(false);
          setCurrentView('landing');
          setIsCeoModalOpen(false);
          setIsSuperAdminModalOpen(false);
          sessionStorage.setItem('cardapp_current_view', 'landing');
          return;
        }

        if (savedView === 'login') {
          setIsResolvingStore(false);
          setLoginModalMode('login');
          setCurrentView('login');
          setIsLoginModalOpen(true);
          return;
        } else if (isClienteRoute || view === 'cardapio' || view === 'menu' || savedView === 'menu') {
          setIsResolvingStore(false);
          if (lastStore) {
            storageService.setStoreId(lastStore);
          }
          setCurrentView('menu');
          return;
        } else if (savedView === 'landing') {
          setIsResolvingStore(false);
          setCurrentView('landing');
          return;
        } else {
          setIsResolvingStore(false);
          setCurrentView('landing');
          sessionStorage.setItem('cardapp_current_view', 'landing');
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

  // Active Order for Step 4 (ignores finalized orders so they disappear from client active tracking and stay only in history)
  const currentActiveOrder = useMemo(() => {
    if (activeOrderId) {
      const found = orders.find((o) => o.id === activeOrderId && o.status !== 'finalizado');
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

    // Envia automaticamente a comanda digitada completa para o WhatsApp da loja
    if (settings.phoneWhatsapp) {
      try {
        const whatsappUrl = getOrderWhatsAppUrl(newOrder, settings);
        if (whatsappUrl) {
          const a = document.createElement('a');
          a.href = whatsappUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch {
        // fallback
      }
    }

    // Solicita permissão para notificações push no navegador para avisar quando o CEO atualizar
    try {
      requestPushPermission();
    } catch {
      // ignore
    }

    lastActiveOrderStatusRef.current = 'recebido';
    setOrders(storageService.getOrders());
    setCartItems([]);
    setActiveOrderId(newOrder.id);
    setCurrentStep(4);
  };

  // CEO Actions
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    storageService.updateOrderStatus(orderId, newStatus);
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
    localStorage.setItem('cardapp_last_store_id', user.storeId);
    setCurrentUser(user);
    setCartItems([]);
    setActiveOrderId(null);
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    setIsLoginModalOpen(false);

    if (user.role === 'super_admin') {
      setIsSuperAdminModalOpen(true);
      setIsCeoModalOpen(false);
      setCurrentView('menu');
      localStorage.setItem('cardapp_last_view', 'menu');
    } else {
      setIsCeoModalOpen(true);
      setIsSuperAdminModalOpen(false);
      setCurrentView('menu');
      localStorage.setItem('cardapp_last_view', 'ceo');
      try {
        const cleanUrl = getClientAppUrl(user.storeId, user.storeName);
        const parsed = new URL(cleanUrl);
        window.history.replaceState({}, '', parsed.pathname + parsed.search);
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
    localStorage.setItem('cardapp_last_store_id', targetUser.storeId);
    setCurrentUser(targetUser);
    setCartItems([]);
    setActiveOrderId(null);
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    setIsSuperAdminModalOpen(false);
    setIsCeoModalOpen(true);
    setCurrentView('menu');
    localStorage.setItem('cardapp_last_view', 'ceo');
  };

  const handleReturnToSuperAdmin = () => {
    const res = accountService.returnToSuperAdmin();
    if (!res.success || !res.user) return;
    const adminUser = res.user;
    storageService.setAuthContext('super_admin', adminUser.storeId);
    setCurrentUser(adminUser);
    setCartItems([]);
    setActiveOrderId(null);
    setIsCeoModalOpen(false);
    setIsSuperAdminModalOpen(true);
    setCurrentView('menu');
    localStorage.setItem('cardapp_last_view', 'menu');
  };

  const handleLogout = () => {
    accountService.logout();
    storageService.setAuthContext(null, 'default_store');
    setCurrentUser(null);
    localStorage.removeItem('cardapp_last_view');
    localStorage.removeItem('cardapp_last_store_id');
    storageService.setStoreId('default_store');
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
    setCartItems([]);
    setCurrentStep(1);
  };

  const handleGoToLanding = () => {
    setCurrentView('landing');
    localStorage.removeItem('cardapp_last_view');
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
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
          onOpenLogin={() => {
            setLoginModalMode('login');
            setCurrentView('login');
            setIsLoginModalOpen(true);
          }}
          onOpenRegister={() => {
            setLoginModalMode('register');
            setCurrentView('login');
            setIsLoginModalOpen(true);
          }}
          onOpenDemoMenu={handleOpenDemoMenu}
        />
      )}

      {/* Fallback caso currentView esteja em algum valor não reconhecido */}
      {currentView !== 'landing' && currentView !== 'login' && currentView !== 'menu' && (
        <LandingPage
          onOpenLogin={() => {
            setLoginModalMode('login');
            setCurrentView('login');
            setIsLoginModalOpen(true);
          }}
          onOpenRegister={() => {
            setLoginModalMode('register');
            setCurrentView('login');
            setIsLoginModalOpen(true);
          }}
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
          <p className="text-xs text-slate-500 mt-1">Buscando produtos e informações atualizadas</p>
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

          {/* Top Header - SOMENTE OPÇÕES DO CLIENTE (SEM SETA PARA LANDING PAGE) */}
          <Header
            settings={settings}
            cartCount={totalCartCount}
            onOpenCart={() => setCurrentStep(2)}
            onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
            onViewMenuClick={() => setCurrentStep(1)}
            hasActiveOrder={Boolean(currentActiveOrder)}
            activeOrderStatus={currentActiveOrder?.status}
            activeOrderDisplayId={currentActiveOrder?.displayId}
            customerOrdersCount={clientOrders.length}
            onViewTracking={() => setCurrentStep(4)}
            onGoToLanding={handleGoToLanding}
          />

          {/* 4 ETAPAS TRACKER FOR CLIENT */}
          <StepTracker
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
            cartCount={totalCartCount}
            hasActiveOrder={Boolean(currentActiveOrder)}
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

              {/* Discreet Lower Quick Access for CEO / Landing / Login */}
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
                  onClick={() => {
                    setLoginModalMode('login');
                    setCurrentView('login');
                    setIsLoginModalOpen(false);
                    try {
                      window.history.pushState({}, '', '/?view=login');
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-slate-500 hover:text-slate-800 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Ir para a aba de Login"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Entrar / Login</span>
                </button>
              </div>
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
        onClose={() => setSelectedProductForModal(null)}
        onConfirm={handleAddToCart}
      />

      {/* STORE INFO SIDEBAR (TOP-LEFT DRAWER) */}
      <StoreInfoSidebar
        isOpen={isStoreInfoOpen}
        onClose={() => setIsStoreInfoOpen(false)}
        settings={settings}
      />

      {/* CEO / STORE OWNER ADMIN MODAL */}
      <CEOAdminModal
        key={`${currentUser?.storeId || 'default'}_${currentUser?.id || 'guest'}`}
        isOpen={isCeoModalOpen}
        onClose={() => {
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
          setIsCeoModalOpen(false);
          setCurrentView('menu');
          localStorage.setItem('cardapp_last_view', 'menu');
        }}
        onLogout={handleLogout}
        isAdminImpersonating={accountService.isImpersonating()}
        onReturnToSuperAdmin={handleReturnToSuperAdmin}
      />

      {/* SUPER ADMIN MODAL (SAMUEL_ADM1 - GERADOR DE CONTAS E BANCO DE DADOS) */}
      {currentUser && (
        <SuperAdminModal
          isOpen={isSuperAdminModalOpen}
          onClose={() => setIsSuperAdminModalOpen(false)}
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
