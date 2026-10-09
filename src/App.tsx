/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
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
import { testFirestoreConnection } from './firebase';
import { getOrderWhatsAppUrl } from './utils/comandaFormatter';
import {
  triggerOrderStatusNotification,
  getStatusNotificationMessage,
  requestPushPermission,
} from './utils/notificationService';

export default function App() {
  // Navigation view: 'landing' (SaaS presentation & pricing R$ 24,99) vs 'menu' (Digital Menu)
  const [currentView, setCurrentView] = useState<'landing' | 'menu'>('landing');

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
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(storageService.getSettings());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(storageService.getActiveOrderId());

  // 4 Steps for Customer (1: Cardápio, 2: Sacola, 3: Identificação & Entrega, 4: Acompanhamento)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Filtering & Search in Menu (Step 1)
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Panels
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCeoModalOpen, setIsCeoModalOpen] = useState(false);
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);

  // Check URL query parameters or paths
  useEffect(() => {
    const syncRouteFromUrl = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');

        const isCeoRoute =
          view === 'ceo' ||
          view === 'admin' ||
          view === 'login' ||
          view === 'entrar' ||
          pathname === '/ceo' ||
          pathname === '/admin' ||
          pathname === '/login' ||
          pathname === '/entrar' ||
          pathname.startsWith('/admin/');

        const isClienteRoute =
          view === 'cliente' ||
          view === 'cardapio' ||
          pathname === '/cliente' ||
          pathname === '/cardapio' ||
          pathname === '/menu';

        if (view === 'login' || view === 'entrar' || pathname === '/login' || pathname === '/entrar') {
          setIsLoginModalOpen(true);
        } else if (isCeoRoute) {
          // Hide landing page behind CEO panel by setting currentView to menu or blank state
          setCurrentView('menu');
          const session = accountService.getCurrentSession();
          if (session?.role === 'super_admin') {
            setIsSuperAdminModalOpen(true);
          } else if (session?.role === 'store_admin') {
            setIsCeoModalOpen(true);
          } else {
            setIsLoginModalOpen(true);
          }
        } else if (isClienteRoute) {
          setCurrentView('menu');
        } else {
          // Default to landing page on home
          setCurrentView('landing');
        }
      } catch {
        // ignore
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  // Load initial data and subscribe to storage changes
  useEffect(() => {
    testFirestoreConnection();
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    const storedActiveId = storageService.getActiveOrderId();
    if (storedActiveId) {
      setActiveOrderId(storedActiveId);
    }

    const unsubscribeStorage = storageService.subscribe(() => {
      setProducts(storageService.getProducts());
      setOrders(storageService.getOrders());
      setCategories(storageService.getCategories());
      setSettings(storageService.getSettings());
      setActiveOrderId(storageService.getActiveOrderId());
    });

    const unsubscribeAuth = accountService.subscribe(() => {
      setCurrentUser(accountService.getCurrentSession());
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

  // Active Order for Step 4
  const currentActiveOrder = useMemo(() => {
    if (activeOrderId) {
      const found = orders.find((o) => o.id === activeOrderId);
      if (found) return found;
    }
    return orders.length > 0 ? orders[0] : null;
  }, [orders, activeOrderId]);

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
    try {
      const whatsappUrl = getOrderWhatsAppUrl(newOrder, settings);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // fallback
    }

    // Solicita permissão para notificações push no navegador para avisar quando o CEO atualizar
    try {
      requestPushPermission();
    } catch {
      // ignore
    }

    lastActiveOrderStatusRef.current = 'recebido';
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
    setCurrentView('menu');
    setShowSplash(true);
    try {
      window.history.pushState({}, '', '/?view=cardapio');
    } catch {
      // ignore
    }
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // ignore
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'super_admin') {
      setIsSuperAdminModalOpen(true);
      setIsCeoModalOpen(false);
    } else {
      setIsCeoModalOpen(true);
      setIsSuperAdminModalOpen(false);
    }
  };

  const handleLogout = () => {
    accountService.logout();
    setCurrentUser(null);
    setIsSuperAdminModalOpen(false);
    setIsCeoModalOpen(false);
  };

  const handleStartNewOrder = () => {
    storageService.clearActiveOrderId();
    setActiveOrderId(null);
    setCurrentStep(1);
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

      {/* 1. SAAS LANDING PAGE (PLANO R$ 24,99/MÊS E PERSUASÃO) */}
      {currentView === 'landing' && (
        <LandingPage
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenDemoMenu={handleOpenDemoMenu}
        />
      )}

      {/* 2. DIGITAL MENU VIEW FOR CLIENTS (SOMENTE CLIENTE SEM CEO) */}
      {currentView === 'menu' && (
        <>
          {/* Welcome Splash Animation in Yellow & White */}
          {showSplash && (
            <WelcomeSplash
              storeName={settings.storeName}
              logoBase64={settings.logoBase64}
              onFinish={() => setShowSplash(false)}
            />
          )}

          {/* Top Header - SOMENTE OPÇÕES DO CLIENTE (SEM ACESSO DO CEO) */}
          <Header
            settings={settings}
            cartCount={totalCartCount}
            onOpenCart={() => setCurrentStep(2)}
            onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
            onViewMenuClick={() => setCurrentStep(1)}
            onBackToLanding={handleBackToLanding}
            showCeoControls={false}
          />

          {/* 4 ETAPAS TRACKER FOR CLIENT */}
          <StepTracker
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
            cartCount={totalCartCount}
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
                      Todos os Itens ({products.length})
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                settings={settings}
                onNewOrder={handleStartNewOrder}
              />
            )}
          </main>

          {/* Centered Footer with SF TECNOLOGIA */}
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
        isOpen={isCeoModalOpen}
        onClose={() => setIsCeoModalOpen(false)}
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
        }}
      />

      {/* SUPER ADMIN MODAL (SAMUEL_ADM1 - GERADOR DE CONTAS E BANCO DE DADOS) */}
      {currentUser && (
        <SuperAdminModal
          isOpen={isSuperAdminModalOpen}
          onClose={() => setIsSuperAdminModalOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchToStore={() => {
            setIsSuperAdminModalOpen(false);
            setIsCeoModalOpen(true);
          }}
        />
      )}

      {/* LOGIN MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
