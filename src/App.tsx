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
} from './types';
import { storageService } from './services/storageService';
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

export default function App() {
  // Splash Welcome Animation in Yellow & White
  const [showSplash, setShowSplash] = useState(true);

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
  const [isCeoViewMode, setIsCeoViewMode] = useState(false);
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);

  // Check URL query parameters or paths for separated links (?view=ceo vs ?view=cliente, /ceo, /admin)
  useEffect(() => {
    const syncRouteFromUrl = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');
        const isCeoRoute =
          view === 'ceo' ||
          pathname === '/ceo' ||
          pathname === '/admin' ||
          pathname.startsWith('/admin/');
        const isClienteRoute =
          view === 'cliente' ||
          pathname === '/cliente' ||
          pathname === '/cardapio';

        if (isCeoRoute) {
          setIsCeoViewMode(true);
          setIsCeoModalOpen(true);
          setShowSplash(false);
        } else if (isClienteRoute) {
          setIsCeoViewMode(false);
          setIsCeoModalOpen(false);
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
    setProducts(storageService.getProducts());
    setOrders(storageService.getOrders());
    setCategories(storageService.getCategories());
    setSettings(storageService.getSettings());
    const storedActiveId = storageService.getActiveOrderId();
    if (storedActiveId) {
      setActiveOrderId(storedActiveId);
    }

    const unsubscribe = storageService.subscribe(() => {
      setProducts(storageService.getProducts());
      setOrders(storageService.getOrders());
      setCategories(storageService.getCategories());
      setSettings(storageService.getSettings());
      setActiveOrderId(storageService.getActiveOrderId());
    });

    return () => unsubscribe();
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
      const compIdsString = (selectedComplements || []).map((c) => c.id).sort().join(',');
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.notes === (notes || '') &&
          (item.selectedComplements || []).map((c) => c.id).sort().join(',') === compIdsString
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantityToAdd;
        updated[existingIndex].quantity = newQty;

        let newBase = product.price * newQty;
        if (product.promotion?.enabled && newQty >= product.promotion.promoQuantity) {
          const b = Math.floor(newQty / product.promotion.promoQuantity);
          const r = newQty % product.promotion.promoQuantity;
          newBase = b * product.promotion.promoPrice + r * product.price;
        }
        const newComps = (selectedComplements || []).reduce((acc, c) => acc + c.price, 0) * newQty;
        updated[existingIndex].totalPrice = newBase + newComps;
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
    const deliveryFee = customerData.deliveryType === 'delivery' ? settings.deliveryFee : 0;
    const total = cartSubtotal + deliveryFee;

    const newOrder = storageService.createOrder({
      items: cartItems,
      subtotal: cartSubtotal,
      deliveryFee,
      total,
      customer: customerData,
    });

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

  // Category Actions
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

  const handleSwitchToClientView = () => {
    setIsCeoViewMode(false);
    setIsCeoModalOpen(false);
    try {
      window.history.pushState({}, '', '/?view=cliente');
    } catch {
      // ignore
    }
  };

  const handleSwitchToCeoMode = () => {
    setIsCeoViewMode(true);
    setIsCeoModalOpen(true);
    try {
      window.history.pushState({}, '', '/?view=ceo');
    } catch {
      // ignore
    }
  };

  const handleStartNewOrder = () => {
    storageService.setActiveOrderId(null);
    setActiveOrderId(null);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Welcome Splash Animation in Yellow & White */}
      {showSplash && (
        <WelcomeSplash
          storeName={settings.storeName}
          logoBase64={settings.logoBase64}
          onFinish={() => setShowSplash(false)}
        />
      )}

      {/* Top Header with Top-Left Info Bar and Top-Right 3 Bars for CEO */}
      <Header
        settings={settings}
        cartCount={totalCartCount}
        onOpenCart={() => setCurrentStep(2)}
        onOpenCeoMenu={() => setIsCeoModalOpen(true)}
        onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
        onViewMenuClick={() => setCurrentStep(1)}
        activeOrderCount={pendingOrdersCount}
        isCeoView={isCeoViewMode}
        onSwitchToClientMode={handleSwitchToClientView}
        onSwitchToCeoMode={handleSwitchToCeoMode}
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
            {/* Top Greeting Header (Clean, uncrowded - all heavy details are inside the top-left sidebar) */}
            <div className="bg-gradient-to-b from-amber-100/50 via-amber-50/20 to-transparent pt-6 pb-2 px-4 text-center">
              <div className="max-w-4xl mx-auto">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300 inline-block mb-2">
                  Cardápio Digital Oficial
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
                  {settings.storeName}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {settings.tagline}
                </p>
              </div>
            </div>

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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Categories (Managed by CEO) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shadow-2xs active:scale-95 ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                          : 'bg-white text-slate-700 border border-amber-200/80 hover:bg-amber-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Product Grid */}
            <section className="max-w-5xl mx-auto px-4 py-3">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-amber-200 p-8 my-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center mb-3">
                    <ForkKnifeIcon className="w-8 h-8 text-amber-500 stroke-[2]" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Não encontramos nenhum item correspondente a "{searchQuery}". Tente outra categoria ou termo de busca.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProducts.map((product) => {
                    const cartItem = cartItems.find((ci) => ci.product.id === product.id);
                    const qty = cartItem ? cartItem.quantity : 0;

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantityInCart={qty}
                        onAddToCart={(prod, q) => handleAddToCart(prod, q)}
                        onUpdateQuantity={(prod, newQ) => handleUpdateCartQuantity(prod.id, newQ)}
                        onOpenDetails={(prod) => setSelectedProductForModal(prod)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ETAPA 2: SACOLA / REVISÃO */}
        {currentStep === 2 && (
          <CartStep
            items={cartItems}
            settings={settings}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onBackToMenu={() => setCurrentStep(1)}
            onProceedToCheckout={() => setCurrentStep(3)}
          />
        )}

        {/* ETAPA 3: IDENTIFICAÇÃO & ENTREGA */}
        {currentStep === 3 && (
          <CheckoutStep
            items={cartItems}
            settings={settings}
            onBackToCart={() => setCurrentStep(2)}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {/* ETAPA 4: ACOMPANHAR PEDIDO (STATUS EM TEMPO REAL) */}
        {currentStep === 4 && (
          <OrderTrackingStep
            order={currentActiveOrder}
            settings={settings}
            onNewOrder={handleStartNewOrder}
            onRefresh={() => {
              setOrders(storageService.getOrders());
            }}
          />
        )}
      </main>

      {/* Floating Sticky Cart Summary on Menu Step */}
      {currentStep === 1 && (
        <FloatingCartBar
          totalItems={totalCartCount}
          subtotal={cartSubtotal}
          onOpenCart={() => setCurrentStep(2)}
        />
      )}

      {/* BARRA NO LADO SUPERIOR ESQUERDO COM TODAS AS INFORMAÇÕES DA LOJA */}
      <StoreInfoSidebar
        isOpen={isStoreInfoOpen}
        onClose={() => setIsStoreInfoOpen(false)}
        settings={settings}
      />

      {/* Product Customizer Modal (Abre ao selecionar produto, com complementos e quantidades) */}
      <ProductCustomizerModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onConfirm={(prod, q, notes, selectedComplements, appliedPromo, grandTotal) =>
          handleAddToCart(prod, q, notes, selectedComplements, appliedPromo, grandTotal)
        }
      />

      {/* CEO Administrative Panel (Accessible via 3 Bars in Top-Right) */}
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
        onSwitchToClientView={handleSwitchToClientView}
      />

      {/* Persistent Switcher / Direct Access in Bottom Corner */}
      <aside className="fixed bottom-3 right-3 z-30 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-amber-300 shadow-lg text-xs">
        <button
          type="button"
          onClick={handleSwitchToCeoMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 font-extrabold text-slate-950 transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
          <span>Painel do CEO (3 Barras)</span>
        </button>

        <span className="text-slate-300">|</span>

        <button
          type="button"
          onClick={() => {
            if (currentStep === 4) setCurrentStep(1);
            else if (orders.length > 0) setCurrentStep(4);
            else setCurrentStep(1);
          }}
          className="text-slate-600 hover:text-slate-900 font-bold transition-colors cursor-pointer px-1"
        >
          {currentStep === 4 ? 'Ver Cardápio' : 'Ver Rastreio (Etapa 4)'}
        </button>
      </aside>
    </div>
  );
}
