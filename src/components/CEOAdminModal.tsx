import React, { useState, useMemo } from 'react';
import {
  X,
  LayoutDashboard,
  Utensils,
  Settings,
  Share2,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  Printer,
  MessageCircle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  QrCode,
  Calendar,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Tag,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Store,
  Instagram,
  Search,
} from 'lucide-react';
import {
  Product,
  Order,
  OrderStatus,
  StoreSettings,
  ProductComplement,
  ProductPromotion,
  Category,
} from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ForkKnifeIcon, ForkKnifePlaceholder } from './ForkKnifeIcon';
import { OFFICIAL_APP_URL, getClientAppUrl, getCeoAppUrl } from '../utils/constants';
import {
  getEstimatedTimeWindow,
  getDeliveryTypeLabel,
  getOrderWhatsAppUrl,
} from '../utils/comandaFormatter';

interface CEOAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  categories: Category[];
  settings: StoreSettings;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onSaveSettings: (settings: StoreSettings) => void;
  onSwitchToClientView: () => void;
}

export const CEOAdminModal: React.FC<CEOAdminModalProps> = ({
  isOpen,
  onClose,
  products,
  orders,
  categories,
  settings,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory,
  onSaveSettings,
  onSwitchToClientView,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'orders' | 'finance' | 'products' | 'settings' | 'share'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [copiedCeoLink, setCopiedCeoLink] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Two-step deletion modal state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<1 | 2>(1);

  // Form State for Add / Edit Product
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('acai');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageBase64, setProdImageBase64] = useState<string>('');
  const [prodAvailable, setProdAvailable] = useState(true);

  // Promotion Form State
  const [hasPromo, setHasPromo] = useState(false);
  const [promoQty, setPromoQty] = useState('2');
  const [promoPrice, setPromoPrice] = useState('');

  // Complements Form State
  const [complementsList, setComplementsList] = useState<ProductComplement[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrice, setNewCompPrice] = useState('');

  // Form State for Store Settings
  const [localSettings, setLocalSettings] = useState<StoreSettings>({ ...settings });
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Group Orders by Date Key (ex: 2026-10-08)
  const groupedOrdersByDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    // Sort orders newest first
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sorted.forEach((order) => {
      const key = order.dateKey || (order.createdAt ? order.createdAt.split('T')[0] : 'Hoje');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(order);
    });

    return Array.from(map.entries());
  }, [orders]);

  // Financial Stats Calculation
  const financialStats = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
    const totalOrdersCount = orders.length;
    const avgTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    // By payment method
    const paymentBreakdown = {
      pix: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      dinheiro: 0,
    };

    orders.forEach((o) => {
      if (paymentBreakdown[o.customer.paymentMethod] !== undefined) {
        paymentBreakdown[o.customer.paymentMethod] += o.total;
      }
    });

    // Entries by Date
    const entriesByDate = groupedOrdersByDate.map(([dateKey, dateOrders]) => {
      const dayTotal = dateOrders.reduce((acc, o) => acc + o.total, 0);
      const dayCount = dateOrders.length;
      const dayAvg = dayCount > 0 ? dayTotal / dayCount : 0;
      return {
        dateKey,
        dayTotal,
        dayCount,
        dayAvg,
        orders: dateOrders,
      };
    });

    return {
      totalRevenue,
      totalOrdersCount,
      avgTicket,
      paymentBreakdown,
      entriesByDate,
    };
  }, [orders, groupedOrdersByDate]);

  // Format Date Header for Display (e.g. 08/10/2026)
  const formatDateHeader = (dateKey: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const d = new Date(dateKey + 'T00:00:00');
      const formatted = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      if (dateKey === today) {
        return `Hoje (${formatted})`;
      }
      return formatted;
    } catch {
      return dateKey;
    }
  };

  // Total matching orders for search & status filter
  const totalMatchingOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = orderFilter === 'all' ? true : o.status === orderFilter;
      if (!matchesStatus) return false;
      if (!orderSearchQuery.trim()) return true;
      const query = orderSearchQuery.toLowerCase().trim();
      const cleanDigits = query.replace(/\D/g, '');
      const matchesId =
        o.displayId.toLowerCase().includes(query) ||
        (cleanDigits.length > 0 && o.displayId.replace(/\D/g, '').includes(cleanDigits));
      const matchesCustomer =
        o.customer.name.toLowerCase().includes(query) ||
        o.customer.phone.replace(/\D/g, '').includes(cleanDigits || query);
      const matchesTable = o.customer.tableNumber?.toLowerCase().includes(query) || false;
      const matchesAddress =
        o.customer.address
          ? o.customer.address.street.toLowerCase().includes(query) ||
            o.customer.address.neighborhood.toLowerCase().includes(query) ||
            o.customer.address.city.toLowerCase().includes(query)
          : false;
      const matchesItems = o.items.some((it) => it.product.name.toLowerCase().includes(query));
      return matchesId || matchesCustomer || matchesTable || matchesAddress || matchesItems;
    }).length;
  }, [orders, orderFilter, orderSearchQuery]);

  // Handle Base64 Image Upload for Products
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProdImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Base64 Logo Upload for Store
  const handleStoreLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLocalSettings((prev) => ({
          ...prev,
          logoBase64: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Product
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory('acai');
    setProdPrice('');
    setProdDescription('');
    setProdImageBase64('');
    setProdAvailable(true);
    setHasPromo(false);
    setPromoQty('2');
    setPromoPrice('');
    setComplementsList([]);
    setNewCompName('');
    setNewCompPrice('');
    setIsProductFormOpen(true);
  };

  // Open Edit Product
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(prod.price.toString());
    setProdDescription(prod.description);
    setProdImageBase64(prod.image || '');
    setProdAvailable(prod.isAvailable);

    if (prod.promotion && prod.promotion.enabled) {
      setHasPromo(true);
      setPromoQty(prod.promotion.promoQuantity.toString());
      setPromoPrice(prod.promotion.promoPrice.toString());
    } else {
      setHasPromo(false);
      setPromoQty('2');
      setPromoPrice('');
    }

    setComplementsList(prod.complements ? [...prod.complements] : []);
    setNewCompName('');
    setNewCompPrice('');
    setIsProductFormOpen(true);
  };

  // Add Complement to Product
  const handleAddComplement = () => {
    if (!newCompName.trim()) return;
    const priceNum = parseFloat(newCompPrice.replace(',', '.')) || 0;
    const newComp: ProductComplement = {
      id: 'comp-' + Date.now(),
      name: newCompName.trim(),
      price: priceNum,
    };
    setComplementsList((prev) => [...prev, newComp]);
    setNewCompName('');
    setNewCompPrice('');
  };

  const handleRemoveComplement = (compId: string) => {
    setComplementsList((prev) => prev.filter((c) => c.id !== compId));
  };

  // Save Product (No prep time!)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(prodPrice.replace(',', '.'));
    if (!prodName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const promoData: ProductPromotion | undefined = hasPromo
      ? {
          enabled: true,
          promoQuantity: parseInt(promoQty) || 2,
          promoPrice: parseFloat(promoPrice.replace(',', '.')) || priceNum,
          description: `Leve ${promoQty} por ${formatCurrency(
            parseFloat(promoPrice.replace(',', '.')) || priceNum
          )}`,
        }
      : undefined;

    const productPayload = {
      name: prodName.trim(),
      category: prodCategory,
      price: priceNum,
      description: prodDescription.trim(),
      image: prodImageBase64,
      isAvailable: prodAvailable,
      promotion: promoData,
      complements: complementsList,
    };

    if (editingProductId) {
      onUpdateProduct({
        ...productPayload,
        id: editingProductId,
      });
    } else {
      onAddProduct(productPayload);
    }

    setIsProductFormOpen(false);
  };

  // Save Store Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 2500);
  };

  // Deletion Two-Step Confirmation
  const handleStartDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setDeleteConfirmationStep(1);
  };

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete) {
      onDeleteOrder(orderToDelete.id);
      setOrderToDelete(null);
      setDeleteConfirmationStep(1);
    }
  };

  // Copy share link
  const handleCopyMenuLink = () => {
    const url = window.location.origin + window.location.pathname + '?view=cliente';
    navigator.clipboard.writeText(url);
    setCopiedClientLink(true);
    setTimeout(() => setCopiedClientLink(false), 2500);
  };

  // WhatsApp Customer
  const openWhatsAppCustomer = (order: Order) => {
    const cleanPhone = order.customer.phone.replace(/\D/g, '');
    let msg = `Olá ${order.customer.name}! Aqui é da ${settings.storeName}.\n`;
    if (order.status === 'recebido') {
      msg += `Recebemos seu pedido ${order.displayId} com sucesso e já está sendo preparado!`;
    } else if (order.status === 'em_producao') {
      msg += `Seu pedido ${order.displayId} está em produção na nossa cozinha!`;
    } else if (order.status === 'em_rota') {
      msg += `Seu pedido ${order.displayId} acabou de sair em rota de entrega!`;
    } else {
      msg += `Seu pedido ${order.displayId} foi finalizado. Agradecemos a preferência!`;
    }
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-5xl w-full h-[95vh] max-h-[95vh] shadow-2xl border border-amber-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CEO Panel Top Header */}
        <div className="bg-amber-400 p-4 sm:p-5 flex items-center justify-between text-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-sm overflow-hidden">
              {settings.logoBase64 ? (
                <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-none">
                  Painel de Gestão do CEO
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-950 text-amber-300">
                  Administração
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {settings.storeName} • {orders.length} pedidos no total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToClientView}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-950 font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Ver Cardápio do Cliente</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-950 text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar Painel CEO"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* CEO Navigation Tabs */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 flex items-center justify-between overflow-x-auto shrink-0">
          <div className="flex gap-1 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel de Pedidos por Data</span>
              {orders.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-300 text-[10px] flex items-center justify-center font-mono">
                  {orders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Painel Financeiro & Entradas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/60'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Gerenciar Produtos ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configurações & Logo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/60'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Link & QR Code</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 py-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200 transition-colors"
              title={soundEnabled ? 'Alerta sonoro ativo' : 'Alerta sonoro mudo'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: PAINEL DE PEDIDOS SEPARADOS POR DATA */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Search Bar for Orders */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300 shadow-2xs space-y-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-amber-600 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Buscar pedido por número (ex: 63126), nome do cliente, WhatsApp ou item..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {orderSearchQuery && (
                  <div className="flex items-center justify-between text-xs text-amber-900 font-bold px-1">
                    <span>
                      Resultados para "{orderSearchQuery}": {totalMatchingOrders} {totalMatchingOrders === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="text-xs text-amber-700 underline font-extrabold cursor-pointer hover:text-amber-900"
                    >
                      Limpar filtro
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Tabs by Status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-amber-100/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === 'all'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Todos ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('recebido')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === 'recebido'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Recebido
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('em_producao')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === 'em_producao'
                        ? 'bg-blue-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Em Produção
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('em_rota')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === 'em_rota'
                        ? 'bg-purple-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Em Rota
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('finalizado')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === 'finalizado'
                        ? 'bg-emerald-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Finalizado
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {orders.length} pedidos organizados por data
                </div>
              </div>

              {/* Grouped by Date List */}
              {groupedOrdersByDate.length === 0 ? (
                <div className="bg-white rounded-3xl border border-amber-200 p-12 text-center">
                  <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 text-base mb-1">Nenhum pedido no sistema</h3>
                  <p className="text-xs text-slate-400">
                    Os pedidos realizados pelos clientes aparecerão aqui organizados por dia.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedOrdersByDate.map(([dateKey, dateOrders]) => {
                    const filtered = dateOrders.filter((o) => {
                      const matchesStatus = orderFilter === 'all' ? true : o.status === orderFilter;
                      if (!matchesStatus) return false;
                      if (!orderSearchQuery.trim()) return true;

                      const query = orderSearchQuery.toLowerCase().trim();
                      const cleanDigits = query.replace(/\D/g, '');

                      const matchesId =
                        o.displayId.toLowerCase().includes(query) ||
                        (cleanDigits.length > 0 && o.displayId.replace(/\D/g, '').includes(cleanDigits));
                      const matchesCustomer =
                        o.customer.name.toLowerCase().includes(query) ||
                        o.customer.phone.replace(/\D/g, '').includes(cleanDigits || query);
                      const matchesTable = o.customer.tableNumber?.toLowerCase().includes(query) || false;
                      const matchesAddress =
                        o.customer.address
                          ? o.customer.address.street.toLowerCase().includes(query) ||
                            o.customer.address.neighborhood.toLowerCase().includes(query) ||
                            o.customer.address.city.toLowerCase().includes(query)
                          : false;
                      const matchesItems = o.items.some((it) =>
                        it.product.name.toLowerCase().includes(query)
                      );

                      return matchesId || matchesCustomer || matchesTable || matchesAddress || matchesItems;
                    });
                    if (filtered.length === 0) return null;

                    const dateSubtotal = filtered.reduce((acc, o) => acc + o.total, 0);

                    return (
                      <div key={dateKey} className="space-y-3">
                        {/* Date Divider Header */}
                        <div className="flex items-center justify-between pb-2 border-b-2 border-amber-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">
                              Data: {formatDateHeader(dateKey)}
                            </h3>
                            <span className="text-xs font-bold text-slate-500 bg-amber-100/70 px-2 py-0.5 rounded-md">
                              {filtered.length} {filtered.length === 1 ? 'pedido' : 'pedidos'}
                            </span>
                          </div>
                          <span className="text-xs font-black font-mono text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                            Total do Dia: {formatCurrency(dateSubtotal)}
                          </span>
                        </div>

                        {/* Orders of this Date */}
                        <div className="space-y-3.5">
                          {filtered.map((order) => (
                            <div
                              key={order.id}
                              className="bg-white rounded-3xl border border-amber-200 p-5 shadow-xs hover:border-amber-400 transition-all"
                            >
                              {/* Top Bar of Order Card */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-base font-black text-slate-950">
                                    {order.displayId}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {formatDateTime(order.createdAt)}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                                    {order.customer.deliveryType}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Status Badge */}
                                  <span
                                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                      order.status === 'recebido'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : order.status === 'em_producao'
                                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                        : order.status === 'em_rota'
                                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    }`}
                                  >
                                    ● {order.customer.deliveryType === 'mesa'
                                      ? order.status === 'recebido'
                                        ? 'Na Cozinha'
                                        : order.status === 'em_producao'
                                        ? 'Em Preparo'
                                        : order.status === 'em_rota'
                                        ? `Saindo p/ Mesa ${order.customer.tableNumber || ''}`
                                        : 'Servido na Mesa'
                                      : order.customer.deliveryType === 'retirada'
                                      ? order.status === 'recebido'
                                        ? 'Recebido'
                                        : order.status === 'em_producao'
                                        ? 'Em Produção'
                                        : order.status === 'em_rota'
                                        ? 'Pronto no Balcão'
                                        : 'Retirado'
                                      : order.status === 'recebido'
                                      ? 'Recebido'
                                      : order.status === 'em_producao'
                                      ? 'Em Produção'
                                      : order.status === 'em_rota'
                                      ? 'Em Rota'
                                      : 'Finalizado'}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setPrintOrder(order)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                    title="Imprimir Comanda"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openWhatsAppCustomer(order)}
                                    className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="WhatsApp do Cliente"
                                  >
                                    <MessageCircle className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                                  </button>

                                  {/* DELETE ORDER BUTTON (TRIGGERS 2-STEP CONFIRMATION) */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartDeleteOrder(order)}
                                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                    title="Excluir Pedido (2 Etapas)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Customer info & Comanda items */}
                              <div className="py-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="text-xs space-y-1.5 text-slate-600 bg-amber-50/40 p-3 rounded-2xl border border-amber-100">
                                  <p>
                                    <span className="font-bold text-slate-900">Cliente:</span>{' '}
                                    {order.customer.name} • {order.customer.phone}
                                  </p>
                                  <p>
                                    <span className="font-bold text-slate-900">Destino:</span>{' '}
                                    {order.customer.deliveryType === 'delivery' && order.customer.address
                                      ? `${order.customer.address.street}, ${order.customer.address.number} - ${order.customer.address.neighborhood}`
                                      : order.customer.deliveryType === 'mesa'
                                      ? `Mesa: ${order.customer.tableNumber || 'Salão'}`
                                      : 'Retirada no Balcão'}
                                  </p>
                                  <p>
                                    <span className="font-bold text-slate-900">Pagamento:</span>{' '}
                                    <span className="capitalize">{order.customer.paymentMethod.replace('_', ' ')}</span>
                                  </p>

                                  {order.customer.paymentMethod === 'dinheiro' && order.customer.cashGiven && (
                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 mt-1">
                                      Dinheiro entregue: {formatCurrency(order.customer.cashGiven)} | Troco: {formatCurrency(order.customer.changeToReturn || 0)}
                                    </div>
                                  )}
                                </div>

                                {/* Items breakdown with complements & promo */}
                                <div className="text-xs space-y-1">
                                  <span className="font-black text-slate-800 uppercase tracking-wide block mb-1">
                                    Itens na Comanda:
                                  </span>
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="py-1 border-b border-slate-50 last:border-0">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-bold font-mono text-amber-700 mr-1.5">
                                            {item.quantity}x
                                          </span>
                                          <span className="text-slate-900 font-semibold">{item.product.name}</span>
                                        </div>
                                        <span className="font-mono tabular-nums text-slate-800 font-bold">
                                          {formatCurrency(item.totalPrice)}
                                        </span>
                                      </div>

                                      {/* Complements listed */}
                                      {item.selectedComplements && item.selectedComplements.length > 0 && (
                                        <div className="text-[11px] text-slate-500 ml-5">
                                          + {item.selectedComplements.map((c) => c.name).join(', ')}
                                        </div>
                                      )}

                                      {/* Promo note */}
                                      {item.appliedPromotion && (
                                        <div className="text-[10px] text-amber-800 font-bold ml-5">
                                          * Promoção aplicada ({item.appliedPromotion.promoQuantity} un)
                                        </div>
                                      )}

                                      {item.notes && (
                                        <div className="text-[11px] text-slate-400 italic ml-5">
                                          Obs: {item.notes}
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-slate-950 text-sm">
                                    <span>Total:</span>
                                    <span className="font-mono text-base">{formatCurrency(order.total)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* CEO Status Definitive Control */}
                              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase text-slate-700">
                                  Definir Status da Análise:
                                </span>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'recebido')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                      order.status === 'recebido'
                                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                        : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                                    }`}
                                  >
                                    {order.customer.deliveryType === 'mesa' ? '1. Na Cozinha' : '1. Recebido'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'em_producao')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                      order.status === 'em_producao'
                                        ? 'bg-blue-400 text-slate-950 ring-2 ring-blue-300'
                                        : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                                    }`}
                                  >
                                    {order.customer.deliveryType === 'mesa' ? '2. Em Preparo' : '2. Em Produção'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'em_rota')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                      order.status === 'em_rota'
                                        ? 'bg-purple-400 text-slate-950 ring-2 ring-purple-300'
                                        : 'bg-slate-100 text-slate-600 hover:bg-purple-100'
                                    }`}
                                  >
                                    {order.customer.deliveryType === 'mesa'
                                      ? '3. Saindo p/ Mesa'
                                      : order.customer.deliveryType === 'retirada'
                                      ? '3. Pronto no Balcão'
                                      : '3. Em Rota'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'finalizado')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                      order.status === 'finalizado'
                                        ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {order.customer.deliveryType === 'mesa'
                                      ? '4. Servido na Mesa'
                                      : order.customer.deliveryType === 'retirada'
                                      ? '4. Retirado'
                                      : '4. Finalizado'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAINEL FINANCEIRO (RECEITA DA LOJA COM DATAS DE ENTRADAS) */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* Top Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Receita Total Bruta
                    </span>
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tabular-nums">
                    {formatCurrency(financialStats.totalRevenue)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Acumulado de todos os pedidos no sistema
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Ticket Médio
                    </span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tabular-nums">
                    {formatCurrency(financialStats.avgTicket)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Média de valor por comanda
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Total de Comandas
                    </span>
                    <PackageCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tabular-nums">
                    {financialStats.totalOrdersCount}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Pedidos registrados no cardápio
                  </p>
                </div>
              </div>

              {/* Breakdown by Payment Methods */}
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider mb-4">
                  Receita por Forma de Pagamento
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-xs font-bold text-amber-950 block">Pix</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(financialStats.paymentBreakdown.pix)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-xs font-bold text-amber-950 block">Crédito</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(financialStats.paymentBreakdown.cartao_credito)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-xs font-bold text-amber-950 block">Débito</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(financialStats.paymentBreakdown.cartao_debito)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-xs font-bold text-amber-950 block">Dinheiro</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(financialStats.paymentBreakdown.dinheiro)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Entries Table by Date */}
              <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-xs">
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider mb-4">
                  Histórico de Entradas por Data (Fluxo de Caixa)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-amber-200 text-slate-400 uppercase font-black tracking-wider">
                        <th className="pb-3">Data de Entrada</th>
                        <th className="pb-3">Quantidade de Pedidos</th>
                        <th className="pb-3">Ticket Médio do Dia</th>
                        <th className="pb-3 text-right">Total Faturado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {financialStats.entriesByDate.map((entry) => (
                        <tr key={entry.dateKey} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 font-bold text-slate-900">
                            {formatDateHeader(entry.dateKey)}
                          </td>
                          <td className="py-3 text-slate-700">
                            {entry.dayCount} {entry.dayCount === 1 ? 'pedido' : 'pedidos'}
                          </td>
                          <td className="py-3 font-mono font-semibold text-slate-700">
                            {formatCurrency(entry.dayAvg)}
                          </td>
                          <td className="py-3 font-mono font-black text-slate-950 text-right">
                            {formatCurrency(entry.dayTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GERENCIAR PRODUTOS (BASE64, PROMOÇÕES, COMPLEMENTOS, SEM TEMPO DE PREPARO) */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Catálogo de Produtos do Cardápio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adicione fotos próprias em Base64, promoções de quantidade e complementos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Novo Produto</span>
                </button>
              </div>

              {/* GERENCIAMENTO DE CATEGORIAS (ADICIONAR E EXCLUIR PELO CEO) */}
              <div className="bg-amber-50/70 border border-amber-300 rounded-3xl p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-950 uppercase tracking-wide">
                      Categorias do Cardápio (Gerenciamento do CEO)
                    </h4>
                    <p className="text-xs text-slate-500">
                      O CEO pode adicionar e excluir categorias livremente. As mudanças atualizam o cardápio do cliente na hora.
                    </p>
                  </div>

                  {/* Formulário para adicionar nova categoria */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nova categoria (ex: Sobremesas)"
                      className="text-xs p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 bg-white outline-none min-w-[200px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          onAddCategory(newCategoryName.trim());
                          setNewCategoryName('');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de categorias existentes */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{cat.name}</span>
                      {cat.id !== 'todos' && (
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-0.5 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title={`Excluir categoria ${cat.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Form Modal (Add / Edit) */}
              {isProductFormOpen && (
                <div className="bg-white rounded-3xl border-2 border-amber-400 p-6 shadow-md animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-amber-100 mb-4">
                    <h4 className="font-black text-base text-slate-950">
                      {editingProductId ? 'Editar Produto do Cardápio' : 'Novo Produto'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsProductFormOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nome do Produto *
                        </label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          placeholder="Ex: Açaí Especial 500ml"
                          className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Categoria *
                        </label>
                        <select
                          value={prodCategory}
                          onChange={(e) => setProdCategory(e.target.value)}
                          className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                        >
                          {categories
                            .filter((c) => c.id !== 'todos')
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Preço Unitário (R$) *
                        </label>
                        <input
                          type="text"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          placeholder="Ex: 22.00"
                          className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Disponibilidade
                        </label>
                        <button
                          type="button"
                          onClick={() => setProdAvailable(!prodAvailable)}
                          className={`w-full p-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                            prodAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          <span>{prodAvailable ? 'Ativo no Cardápio' : 'Esgotado / Pausado'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Descrição do Produto
                      </label>
                      <textarea
                        value={prodDescription}
                        onChange={(e) => setProdDescription(e.target.value)}
                        placeholder="Ex: Açaí cremoso batido na consistência perfeita..."
                        rows={2}
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none resize-none"
                      />
                    </div>

                    {/* UPLOAD FOTO PRODUTO EM BASE64 OU DEIXAR GARFO E FACA */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Foto do Produto (Upload pelo CEO ou Garfo e Faca)
                        </label>
                        {prodImageBase64 && (
                          <button
                            type="button"
                            onClick={() => setProdImageBase64('')}
                            className="text-xs text-red-600 hover:underline font-bold"
                          >
                            Remover foto (usar Garfo e Faca)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl border border-amber-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {prodImageBase64 ? (
                            <img src={prodImageBase64} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ForkKnifeIcon className="w-10 h-10 text-amber-500 stroke-[2]" />
                          )}
                        </div>

                        <div className="flex-1">
                          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-2xs">
                            <Upload className="w-4 h-4" />
                            <span>Enviar Foto do seu Dispositivo (Base64)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProductImageUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                            Se não adicionar foto alguma, o cliente verá a elegante ilustração de um garfo e uma faca com o nome do produto.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PROMOÇÃO DE QUANTIDADE (OPCIONAL PELO CEO: Ex: 1 por R$5, 2 por R$8) */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Promoção Especial de Quantidade
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHasPromo(!hasPromo)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            hasPromo ? 'bg-amber-400 text-slate-950 border-amber-500' : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {hasPromo ? 'Promoção Ativada' : 'Sem Promoção'}
                        </button>
                      </div>

                      {hasPromo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Quantidade da Promoção (ex: 2)
                            </label>
                            <input
                              type="number"
                              value={promoQty}
                              onChange={(e) => setPromoQty(e.target.value)}
                              placeholder="2"
                              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Preço Promocional do Combo (R$) (ex: 8.00)
                            </label>
                            <input
                              type="text"
                              value={promoPrice}
                              onChange={(e) => setPromoPrice(e.target.value)}
                              placeholder="Ex: 8.00"
                              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 outline-none font-mono"
                            />
                          </div>
                          <p className="text-[11px] text-amber-800 font-medium sm:col-span-2">
                            Exemplo: 1 por R$ {prodPrice || '5,00'} e {promoQty || '2'} por R$ {promoPrice || '8,00'}.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* COMPLEMENTOS DO PRODUTO (Ex: Açaí -> Leite condensado) */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Complementos do Produto (Opcionais)
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {complementsList.length} adicionados
                        </span>
                      </div>

                      {/* List of current complements */}
                      {complementsList.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {complementsList.map((comp) => (
                            <div
                              key={comp.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                            >
                              <span className="font-bold text-slate-800">{comp.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-600">
                                  {comp.price > 0 ? `+ ${formatCurrency(comp.price)}` : 'Grátis'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveComplement(comp.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new complement row */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-amber-200/80">
                        <input
                          type="text"
                          value={newCompName}
                          onChange={(e) => setNewCompName(e.target.value)}
                          placeholder="Nome do complemento (Ex: Leite condensado)"
                          className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                        />
                        <input
                          type="text"
                          value={newCompPrice}
                          onChange={(e) => setNewCompPrice(e.target.value)}
                          placeholder="Valor extra (R$) ou 0 para grátis"
                          className="w-full sm:w-40 text-xs p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddComplement}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsProductFormOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-xs cursor-pointer"
                      >
                        Salvar Produto
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Products Table/List */}
              <div className="bg-white rounded-3xl border border-amber-200 overflow-hidden divide-y divide-amber-100 shadow-xs">
                {products.map((prod) => (
                  <div key={prod.id} className="p-4 flex items-center justify-between gap-4 hover:bg-amber-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-amber-50 overflow-hidden shrink-0 border border-amber-200 flex items-center justify-center">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ForkKnifeIcon className="w-7 h-7 text-amber-500 stroke-[2]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{prod.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              prod.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {prod.isAvailable ? 'Ativo' : 'Esgotado'}
                          </span>
                          {prod.promotion?.enabled && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              Promoção Ativa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-md">{prod.description}</p>
                        <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-900 mt-0.5">
                          <span>{formatCurrency(prod.price)}</span>
                          {prod.complements && prod.complements.length > 0 && (
                            <span className="text-[11px] font-sans font-normal text-slate-400">
                              • {prod.complements.length} complementos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-2 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-100 transition-colors"
                        title="Editar Produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES DA LOJA (LOGO BASE64, INSTAGRAM, MODALIDADES E PAGAMENTOS) */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white rounded-3xl border border-amber-200 p-6 shadow-xs">
              <h3 className="text-lg font-black text-slate-900 mb-1">Configurações Gerais & Identidade</h3>
              <p className="text-xs text-slate-500 mb-6">
                Personalize a logo da sua loja, Instagram, modalidades de atendimento e formas de pagamento aceitas.
              </p>

              {settingsSavedMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Configurações salvas com sucesso!</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Store Open / Closed Toggle */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="block font-black text-sm text-slate-950">Status do Estabelecimento</span>
                    <span className="text-xs text-slate-600">
                      {localSettings.isOpen ? 'Aberto para receber novos pedidos' : 'Fechado temporariamente'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, isOpen: !localSettings.isOpen })}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      localSettings.isOpen
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-red-500 text-white shadow-xs'
                    }`}
                  >
                    {localSettings.isOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}
                  </button>
                </div>

                {/* UPLOAD DA LOGO DA LOJA DO CEO (BASE64) */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                    Logo Oficial da Loja (Upload Base64)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-amber-400 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      {localSettings.logoBase64 ? (
                        <img
                          src={localSettings.logoBase64}
                          alt="Logo da Loja"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ForkKnifeIcon className="w-10 h-10 text-amber-500 stroke-[2]" />
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-2xs">
                        <Upload className="w-4 h-4" />
                        <span>Escolher Arquivo da Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStoreLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {localSettings.logoBase64 && (
                        <button
                          type="button"
                          onClick={() => setLocalSettings((prev) => ({ ...prev, logoBase64: '' }))}
                          className="block text-xs text-red-600 hover:underline font-bold mt-1"
                        >
                          Remover logo personalizada
                        </button>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Sua logo aparecerá centralizada no topo do cardápio estilo perfil do Instagram!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Redes Sociais: INSTAGRAM e WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-600" />
                      Instagram da Loja (@usuario)
                    </label>
                    <input
                      type="text"
                      value={localSettings.instagramHandle}
                      onChange={(e) => setLocalSettings({ ...localSettings, instagramHandle: e.target.value })}
                      placeholder="@nomedasualoja"
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp do Estabelecimento
                    </label>
                    <input
                      type="text"
                      value={localSettings.phoneWhatsapp}
                      onChange={(e) => setLocalSettings({ ...localSettings, phoneWhatsapp: e.target.value })}
                      placeholder="5511999999999"
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* MODALIDADES DE ATENDIMENTO (ENTREGA, RETIRADA, CONSUMO NO LOCAL) */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                  <span className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                    Como funciona a loja (Modalidades de Atendimento):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.serviceModes.allowDelivery}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            serviceModes: { ...localSettings.serviceModes, allowDelivery: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Entrega (Delivery)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.serviceModes.allowRetirada}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            serviceModes: { ...localSettings.serviceModes, allowRetirada: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Somente Retirada</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.serviceModes.allowMesa}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            serviceModes: { ...localSettings.serviceModes, allowMesa: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Consumo no Local (Mesa)</span>
                    </label>
                  </div>
                </div>

                {/* FORMAS DE PAGAMENTO ACEITAS PELO CEO */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                  <span className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                    Formas de Pagamento Aceitas pela Loja:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.paymentMethods.allowPix}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            paymentMethods: { ...localSettings.paymentMethods, allowPix: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Pix</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.paymentMethods.allowCreditCard}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            paymentMethods: { ...localSettings.paymentMethods, allowCreditCard: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Cartão Crédito</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.paymentMethods.allowDebitCard}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            paymentMethods: { ...localSettings.paymentMethods, allowDebitCard: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Cartão Débito</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.paymentMethods.allowCash}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            paymentMethods: { ...localSettings.paymentMethods, allowCash: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-amber-500 accent-amber-500"
                      />
                      <span>Dinheiro</span>
                    </label>
                  </div>
                </div>

                {/* Additional Store Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome do Restaurante
                    </label>
                    <input
                      type="text"
                      value={localSettings.storeName}
                      onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Taxa de Entrega Padrão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={localSettings.deliveryFee}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, deliveryFee: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chave Pix para Recebimento
                  </label>
                  <input
                    type="text"
                    value={localSettings.pixKey}
                    onChange={(e) => setLocalSettings({ ...localSettings, pixKey: e.target.value })}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={localSettings.address}
                    onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
                  >
                    Salvar Todas as Configurações
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: LINK SEPARADO PARA O CLIENTE E PARA O CEO + QR CODE */}
          {activeTab === 'share' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center pb-2">
                <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center mb-3">
                  <Share2 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Links de Acesso do Sistema (Cliente & CEO)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Links separados e organizados para o cliente fazer pedidos e para o CEO administrar a loja.
                </p>
              </div>

              {/* OPÇÃO DO CLIENTE */}
              <div className="bg-white rounded-3xl border-2 border-amber-400 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <h4 className="font-black text-base text-slate-950">
                      Link do Cardápio para o CLIENTE
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Acesso dos Clientes
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Envie este link no WhatsApp, redes sociais ou coloque na bio do Instagram. O cliente vê os produtos, adiciona com "+", escolhe complementos e acompanha o pedido nas 4 etapas.
                </p>

                {/* Input e Botão de Copiar Link do Cliente - Vercel Oficial */}
                <div className="flex items-center gap-2 p-2 rounded-2xl border border-amber-300 bg-amber-50/70 mb-5">
                  <input
                    type="text"
                    readOnly
                    value={`${OFFICIAL_APP_URL}/?view=cliente`}
                    className="bg-transparent text-xs text-slate-900 font-bold flex-1 px-2 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clientUrl = `${OFFICIAL_APP_URL}/?view=cliente`;
                      navigator.clipboard.writeText(clientUrl);
                      setCopiedClientLink(true);
                      setTimeout(() => setCopiedClientLink(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    {copiedClientLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedClientLink ? 'Copiado!' : 'Copiar Link do Cliente'}</span>
                  </button>
                </div>

                {/* QR Code Real do Cardápio do Cliente */}
                <div className="p-5 bg-slate-950 rounded-2xl text-center text-white flex flex-col sm:flex-row items-center justify-center gap-5">
                  <div className="w-36 h-36 bg-white p-2.5 rounded-xl flex items-center justify-center text-slate-950 shrink-0">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full fill-slate-950"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="5" y="5" width="26" height="26" rx="4" fill="#000" />
                      <rect x="9" y="9" width="18" height="18" rx="2" fill="#fff" />
                      <rect x="13" y="13" width="10" height="10" rx="1" fill="#000" />
                      <rect x="69" y="5" width="26" height="26" rx="4" fill="#000" />
                      <rect x="73" y="9" width="18" height="18" rx="2" fill="#fff" />
                      <rect x="77" y="13" width="10" height="10" rx="1" fill="#000" />
                      <rect x="5" y="69" width="26" height="26" rx="4" fill="#000" />
                      <rect x="9" y="73" width="18" height="18" rx="2" fill="#fff" />
                      <rect x="13" y="77" width="10" height="10" rx="1" fill="#000" />
                      <rect x="36" y="8" width="6" height="6" />
                      <rect x="46" y="8" width="6" height="6" />
                      <rect x="56" y="8" width="6" height="6" />
                      <rect x="36" y="18" width="6" height="6" />
                      <rect x="46" y="24" width="6" height="6" />
                      <rect x="56" y="18" width="6" height="6" />
                      <rect x="8" y="36" width="6" height="6" />
                      <rect x="18" y="44" width="6" height="6" />
                      <rect x="24" y="36" width="6" height="6" />
                      <rect x="36" y="36" width="8" height="8" rx="1" fill="#EAB308" />
                      <rect x="48" y="36" width="6" height="6" />
                      <rect x="58" y="36" width="8" height="8" rx="1" fill="#EAB308" />
                      <rect x="70" y="36" width="6" height="6" />
                      <rect x="82" y="36" width="6" height="6" />
                      <rect x="36" y="48" width="6" height="6" />
                      <rect x="46" y="46" width="8" height="8" rx="1" fill="#000" />
                      <rect x="58" y="48" width="6" height="6" />
                      <rect x="68" y="48" width="6" height="6" />
                      <rect x="80" y="46" width="6" height="6" />
                      <rect x="8" y="56" width="6" height="6" />
                      <rect x="20" y="56" width="6" height="6" />
                      <rect x="36" y="60" width="6" height="6" />
                      <rect x="48" y="58" width="6" height="6" />
                      <rect x="58" y="60" width="6" height="6" />
                      <rect x="74" y="60" width="6" height="6" />
                      <rect x="84" y="58" width="6" height="6" />
                      <rect x="36" y="72" width="6" height="6" />
                      <rect x="46" y="72" width="6" height="6" />
                      <rect x="58" y="70" width="8" height="8" rx="1" fill="#EAB308" />
                      <rect x="70" y="72" width="6" height="6" />
                      <rect x="82" y="72" width="6" height="6" />
                      <rect x="36" y="84" width="6" height="6" />
                      <rect x="48" y="84" width="6" height="6" />
                      <rect x="56" y="84" width="6" height="6" />
                      <rect x="68" y="84" width="6" height="6" />
                      <rect x="80" y="84" width="6" height="6" />
                    </svg>
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-xs font-black uppercase text-amber-400 tracking-wide block">
                      QR Code Oficial do Cardápio ({OFFICIAL_APP_URL})
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Imprima este QR Code para colocar nas mesas ou no balcão da sua loja. O cliente aponta a câmera e abre o cardápio automaticamente no link oficial Vercel.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[11px] mt-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir QR Code</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* OPÇÃO DO CEO */}
              <div className="bg-white rounded-3xl border border-slate-300 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <h4 className="font-black text-base text-slate-950">
                      Link Administrativo para o CEO
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Acesso do Administrador
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Link direto para o CEO acessar a gestão de pedidos em tempo real, painel financeiro de entradas, gerenciar produtos, criar categorias e configurar a loja.
                </p>

                {/* Input e Botão de Copiar Link do CEO - Vercel Oficial */}
                <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-300 bg-slate-50 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={`${OFFICIAL_APP_URL}/?view=ceo`}
                    className="bg-transparent text-xs text-slate-900 font-bold flex-1 px-2 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const ceoUrl = `${OFFICIAL_APP_URL}/?view=ceo`;
                      navigator.clipboard.writeText(ceoUrl);
                      setCopiedCeoLink(true);
                      setTimeout(() => setCopiedCeoLink(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    {copiedCeoLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCeoLink ? 'Copiado!' : 'Copiar Link do CEO'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer SF TECNOLOGIA */}
        <div className="bg-slate-900 text-slate-400 py-2.5 px-4 text-center text-[10px] font-bold border-t border-slate-800 shrink-0">
          CARDAPP • Desenvolvido por SF TECNOLOGIA • Todos os direitos reservados
        </div>
      </div>

      {/* TWO-STEP CONFIRMATION MODAL TO DELETE ORDER */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-950">
                {deleteConfirmationStep === 1
                  ? 'Excluir Pedido - Confirmação (1/2)'
                  : 'Atenção: Confirmação Definitiva (2/2)'}
              </h3>
            </div>

            {deleteConfirmationStep === 1 ? (
              <>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Você deseja remover a comanda <strong className="text-slate-900">{orderToDelete.displayId}</strong> de <strong>{orderToDelete.customer.name}</strong> ({formatCurrency(orderToDelete.total)}) do sistema?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs cursor-pointer"
                  >
                    Prosseguir para Confirmação Final →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 font-medium mb-4">
                  Esta ação é irreversível. O pedido será excluído permanentemente do painel de pedidos e do histórico financeiro.
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Voltar / Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteOrder}
                    className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black shadow-md cursor-pointer active:scale-95"
                  >
                    Sim, Excluir Definitivamente!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {printOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-4 my-auto border border-amber-300">
            {/* Modal Header Controls (Not Printed) */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase text-slate-800">
                Visualização da Comanda
              </span>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PAPER THERMAL RECEIPT AREA (PRINTED) */}
            <div className="print-area bg-white text-black p-4 rounded-xl border border-dashed border-slate-400 font-mono text-[11px] space-y-2 select-text shadow-xs">
              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                ================================
              </div>

              {/* TIPO DE PEDIDO */}
              <div className="text-center py-0.5">
                <span className="font-black text-sm uppercase tracking-wider block">
                  {getDeliveryTypeLabel(printOrder)}
                </span>
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                ================================
              </div>

              {/* DATA / PREVISÃO / NOME DA LOJA */}
              <div className="text-center space-y-0.5">
                <p className="font-bold">{formatDateTime(printOrder.createdAt)}</p>
                <p className="font-bold">
                  Entrega prevista: {getEstimatedTimeWindow(printOrder.createdAt, settings.estimatedDeliveryTime)}
                </p>
                <p className="font-black text-sm uppercase mt-1">{settings.storeName}</p>
                <p className="text-[10px] text-slate-700">WhatsApp: {settings.phoneWhatsapp}</p>
                {settings.address && (
                  <p className="text-[10px] text-slate-600">{settings.address}</p>
                )}
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                ================================
              </div>

              {/* NÚMERO DO PEDIDO COM 5 DÍGITOS BEM GRANDE */}
              <div className="text-center py-1">
                <span className="text-2xl font-black tracking-wider block">
                  Pedido {printOrder.displayId}
                </span>
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                --------------------------------
              </div>

              {/* DADOS DO CLIENTE */}
              <div className="space-y-0.5 text-[11px]">
                <p><strong className="font-bold">CLIENTE:</strong> {printOrder.customer.name}</p>
                <p><strong className="font-bold">TEL:</strong> {printOrder.customer.phone}</p>
                {printOrder.customer.deliveryType === 'delivery' && printOrder.customer.address && (
                  <p>
                    <strong className="font-bold">END:</strong> {printOrder.customer.address.street}, {printOrder.customer.address.number} - {printOrder.customer.address.neighborhood}
                    {printOrder.customer.address.complement ? ` (${printOrder.customer.address.complement})` : ''} - {printOrder.customer.address.city}
                  </p>
                )}
                {printOrder.customer.deliveryType === 'mesa' && (
                  <p>
                    <strong className="font-bold">LOCAL:</strong> Consumo no Restaurante (Mesa {printOrder.customer.tableNumber || 'Salão'})
                  </p>
                )}
                {printOrder.customer.deliveryType === 'retirada' && (
                  <p>
                    <strong className="font-bold">LOCAL:</strong> Retirada no Balcão
                  </p>
                )}
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                --------------------------------
              </div>

              {/* ITENS DO PEDIDO */}
              <div>
                <span className="font-black text-xs uppercase block mb-1">Itens</span>
                <div className="space-y-1.5">
                  {printOrder.items.map((it, i) => (
                    <div key={i} className="pb-1">
                      <div className="flex justify-between items-baseline font-bold">
                        <span>({it.quantity}) {it.product.name}</span>
                        <span className="tabular-nums font-mono">{formatCurrency(it.totalPrice)}</span>
                      </div>
                      {it.selectedComplements && it.selectedComplements.length > 0 && (
                        <div className="text-[10px] text-slate-700 pl-3">
                          {it.selectedComplements.map((c) => (
                            <p key={c.id}>- {c.name}{c.price > 0 ? ` (+${formatCurrency(c.price)})` : ''}</p>
                          ))}
                        </div>
                      )}
                      {it.appliedPromotion && (
                        <p className="text-[10px] text-amber-900 font-bold pl-3">
                          * Promoção aplicada ({it.appliedPromotion.promoQuantity} un)
                        </p>
                      )}
                      {it.notes && (
                        <p className="text-[10px] text-slate-600 italic pl-3">
                          Obs: {it.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                --------------------------------
              </div>

              {/* SUBTOTAL / TAXA / TOTAL / FORMA DE PAGAMENTO */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(printOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAXA:</span>
                  <span className="font-mono tabular-nums">
                    {printOrder.deliveryFee > 0 ? formatCurrency(printOrder.deliveryFee) : 'Grátis'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-dashed border-slate-400">
                  <span>TOTAL:</span>
                  <span className="font-mono tabular-nums text-base">{formatCurrency(printOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-0.5">
                  <span>PAGTO:</span>
                  <span className="font-bold">{printOrder.customer.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                </div>
                {printOrder.customer.paymentMethod === 'dinheiro' && printOrder.customer.cashGiven && (
                  <div className="text-[10px] bg-slate-100 p-1.5 rounded font-bold mt-1 space-y-0.5 border border-slate-300">
                    <p>VALOR ENTREGUE: {formatCurrency(printOrder.customer.cashGiven)}</p>
                    <p>TROCO A LEVAR: {formatCurrency(printOrder.customer.changeToReturn || 0)}</p>
                  </div>
                )}
              </div>

              {/* Linha Tracejada */}
              <div className="text-center font-bold tracking-widest text-slate-600 select-none">
                ================================
              </div>

              {/* RODAPÉ EXATO CONFORME A FOTO */}
              <div className="text-center space-y-0.5 pt-1 text-[10px]">
                <p className="font-black tracking-widest text-xs">RAPIDO</p>
                <p className="font-bold">Powered By: SF TECNOLOGIA</p>
                <p className="text-slate-600 font-semibold">Acesse: https://cardapp-us.vercel.app</p>
              </div>
            </div>

            {/* Ações (Não impressas) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comanda Térmica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = getOrderWhatsAppUrl(printOrder, settings);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Enviar Comanda no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
