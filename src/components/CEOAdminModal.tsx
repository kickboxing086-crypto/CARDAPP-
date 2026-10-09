import React, { useState, useMemo, useEffect } from 'react';
import { accountService } from '../services/accountService';
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
  MapPin,
  Clock,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import {
  Product,
  Order,
  OrderStatus,
  StoreSettings,
  ProductComplement,
  ProductPromotion,
  Category,
  NeighborhoodDeliveryFee,
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
  onLogout?: () => void;
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
  onLogout,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'orders' | 'finance' | 'products' | 'delivery' | 'settings' | 'share' | 'status'>('orders');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [copiedCeoLink, setCopiedCeoLink] = useState(false);
  const [copiedLoginLink, setCopiedLoginLink] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Two-step logout confirmation state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutConfirmationStep, setLogoutConfirmationStep] = useState<1 | 2>(1);

  // Delivery Neighborhoods State (CEO manages state, city and neighborhoods)
  const [deliveryState, setDeliveryState] = useState('RN');
  const [deliveryCity, setDeliveryCity] = useState('Natal');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('');
  const [deliveryFeeValue, setDeliveryFeeValue] = useState('');
  const [deliveryEstimatedTime, setDeliveryEstimatedTime] = useState('30 - 45 min');
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState('');
  const neighborhoodInputRef = React.useRef<HTMLInputElement>(null);

  // Two-step deletion confirmation state for delivery neighborhood fee
  const [neighborhoodToDelete, setNeighborhoodToDelete] = useState<NeighborhoodDeliveryFee | null>(null);
  const [neighborhoodDeleteStep, setNeighborhoodDeleteStep] = useState<1 | 2>(1);

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

  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

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

  // Salvar taxa de entrega de bairro (mantendo estado e cidade, limpando apenas o bairro)
  const handleSaveDeliveryNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryState.trim() || !deliveryCity.trim() || !deliveryNeighborhood.trim()) {
      return;
    }

    const feeNum = parseFloat(deliveryFeeValue.replace(',', '.')) || 0;
    const existingList = localSettings.deliveryNeighborhoods || [];
    const normalizedBairro = deliveryNeighborhood.trim();
    const normalizedCidade = deliveryCity.trim();
    const normalizedEstado = deliveryState.trim().toUpperCase();

    const existingIndex = existingList.findIndex(
      (n) =>
        n.neighborhood.toLowerCase().trim() === normalizedBairro.toLowerCase() &&
        n.city.toLowerCase().trim() === normalizedCidade.toLowerCase()
    );

    let updatedList: NeighborhoodDeliveryFee[];
    if (existingIndex >= 0) {
      updatedList = existingList.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              state: normalizedEstado,
              city: normalizedCidade,
              neighborhood: normalizedBairro,
              fee: feeNum,
              estimatedTime: deliveryEstimatedTime.trim() || undefined,
            }
          : item
      );
    } else {
      const newEntry: NeighborhoodDeliveryFee = {
        id: `taxa-${Date.now()}`,
        state: normalizedEstado,
        city: normalizedCidade,
        neighborhood: normalizedBairro,
        fee: feeNum,
        estimatedTime: deliveryEstimatedTime.trim() || undefined,
      };
      updatedList = [newEntry, ...existingList];
    }

    const newSettings: StoreSettings = {
      ...localSettings,
      deliveryNeighborhoods: updatedList,
    };

    setLocalSettings(newSettings);
    onSaveSettings(newSettings);

    // Conforme pedido expresso do CEO:
    // "após ter colocado a cidade e o bairro, eles permanecem, o que muda é somente o bairro - após salvar."
    // O estado e a cidade permanecem preenchidos, limpa apenas o bairro e dá foco imediato nele!
    setDeliveryNeighborhood('');
    setDeliverySuccessMsg(`Taxa para o bairro "${normalizedBairro}" cadastrada com sucesso!`);
    setTimeout(() => setDeliverySuccessMsg(''), 3500);

    setTimeout(() => {
      neighborhoodInputRef.current?.focus();
    }, 100);
  };

  // Exclusão de taxa de bairro com confirmação de duas etapas
  const handleConfirmDeleteNeighborhood = () => {
    if (!neighborhoodToDelete) return;

    const updatedList = (localSettings.deliveryNeighborhoods || []).filter(
      (n) => n.id !== neighborhoodToDelete.id
    );

    const newSettings: StoreSettings = {
      ...localSettings,
      deliveryNeighborhoods: updatedList,
    };

    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
    setNeighborhoodToDelete(null);
    setNeighborhoodDeleteStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white animate-in fade-in duration-200">
      <div
        className="bg-white w-full h-full flex overflow-hidden relative shadow-none border-0 rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile backdrop for left sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 z-30 md:hidden animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* BARRA NO LADO SUPERIOR ESQUERDO: TODAS AS OPÇÕES DO CEO ORGANIZADAS */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-72 sm:w-80 bg-white border-r border-amber-200 flex flex-col shrink-0 transition-transform duration-200 shadow-xl md:shadow-none ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Top of Sidebar: Store Branding & CEO Badge */}
          <div className="bg-amber-400 p-4 sm:p-5 flex items-center justify-between text-slate-950 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0">
                {settings.logoBase64 ? (
                  <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 inline-block mb-0.5">
                  Painel do CEO
                </span>
                <h3 className="text-sm font-black text-slate-950 truncate leading-tight">
                  {settings.storeName}
                </h3>
              </div>
            </div>
          </div>

          {/* Section Title */}
          <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-950">
            <span>Barra de Opções do CEO</span>
            <span className="text-[10px] text-amber-800 font-bold font-mono">
              {orders.length} pedidos
            </span>
          </div>

          {/* Nav List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-[#FFFDF7]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 stroke-[2.4]" />
                <span>1. Pedidos em Tempo Real</span>
              </div>
              {orders.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    activeTab === 'orders' ? 'bg-slate-950 text-amber-300' : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {orders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('finance');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 stroke-[2.4]" />
                <span>2. Financeiro & Entradas</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold font-mono">
                {formatCurrency(financialStats.totalRevenue)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('products');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Utensils className="w-4 h-4 stroke-[2.4]" />
                <span>3. Cardápio & Produtos</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  activeTab === 'products' ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('delivery');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'delivery'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bike className="w-4 h-4 stroke-[2.4]" />
                <span>4. Taxas de Entrega</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  activeTab === 'delivery' ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {(localSettings.deliveryNeighborhoods || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 stroke-[2.4]" />
                <span>5. Configurações da Loja</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${settings.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('share');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 stroke-[2.4]" />
                <span>6. Compartilhar Links</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Oficial
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('status');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-500/50'
                  : 'text-slate-700 hover:bg-amber-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 stroke-[2.4]" />
                <span>7. Status da Conta</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                Análise
              </span>
            </button>
          </nav>

          {/* Bottom Actions of Left Sidebar */}
          <div className="p-3 bg-white border-t border-amber-200 space-y-2 shrink-0">
            <div className="flex items-center justify-between px-2 py-1.5 bg-amber-50 rounded-xl text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Alerta Sonoro</span>
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`text-[10px] font-black px-2 py-0.5 rounded cursor-pointer ${
                  soundEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {soundEnabled ? 'LIGADO' : 'MUDO'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onSwitchToClientView();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>Ver Cardápio do Cliente</span>
            </button>

            {/* Sair da Conta do CEO com confirmação de duas etapas */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmationStep(1);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer border border-red-200 mt-2"
                title="Sair da Conta do CEO (Confirmação em duas etapas)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            )}
          </div>
        </aside>

        {/* LADO DIREITO: CONTEÚDO PRINCIPAL ORGANIZADO */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50">
          {/* Top Bar of Active Tab */}
          <div className="bg-white border-b border-amber-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Botão no canto superior esquerdo para abrir a barra de opções do CEO no celular */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer shrink-0"
                title="Abrir barra no lado superior esquerdo com opções do CEO"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Opções do CEO</span>
              </button>

              <h2 className="text-sm sm:text-base font-black text-slate-950 truncate flex items-center gap-2">
                {activeTab === 'orders' && (
                  <>
                    <LayoutDashboard className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Painel de Pedidos em Tempo Real</span>
                  </>
                )}
                {activeTab === 'finance' && (
                  <>
                    <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Painel Financeiro & Entradas</span>
                  </>
                )}
                {activeTab === 'products' && (
                  <>
                    <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Gerenciar Produtos ({products.length})</span>
                  </>
                )}
                {activeTab === 'delivery' && (
                  <>
                    <Bike className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">
                      Taxas de Entrega por Bairro ({(localSettings.deliveryNeighborhoods || []).length})
                    </span>
                  </>
                )}
                {activeTab === 'settings' && (
                  <>
                    <Settings className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Configurações da Loja</span>
                  </>
                )}
                {activeTab === 'share' && (
                  <>
                    <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Compartilhar Links Oficiais</span>
                  </>
                )}
                {activeTab === 'status' && (
                  <>
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Status de Análise e Ativação da Conta</span>
                  </>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSwitchToClientView}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                title="Visualizar Cardápio do Cliente"
              >
                <ForkKnifeIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Ver Cardápio</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoutConfirmationStep(1);
                    setIsLogoutModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Sair da Conta do CEO (Confirmação em duas etapas)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair da Conta</span>
                </button>
              )}
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

          {/* TAB 4: TAXAS DE ENTREGA POR ESTADO, CIDADE E BAIRRO */}
          {activeTab === 'delivery' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header card */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-3xl p-5 sm:p-6 text-slate-950 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Logística & Frete</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-950">
                    Taxas de Entrega por Bairro
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-amber-950/90 mt-1 max-w-xl">
                    Cadastre a taxa cobrada para cada localidade. O <strong>Estado</strong> e a <strong>Cidade</strong> permanecem salvos no formulário após cada envio, permitindo que você adicione vários bairros da mesma cidade de forma rápida e prática!
                  </p>
                </div>
                <div className="bg-white/90 backdrop-blur-xs px-4 py-3 rounded-2xl border border-amber-300 text-center shrink-0 self-stretch sm:self-auto">
                  <span className="block text-[10px] uppercase font-bold text-slate-600">Bairros Cadastrados</span>
                  <span className="text-2xl font-black text-slate-950 font-mono">
                    {(localSettings.deliveryNeighborhoods || []).length}
                  </span>
                </div>
              </div>

              {/* Feedback banner */}
              {deliverySuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{deliverySuccessMsg}</span>
                </div>
              )}

              {/* Formulário de Adicionar / Atualizar Taxa */}
              <div className="bg-white rounded-3xl border border-amber-200 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>Cadastrar Nova Taxa de Bairro</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preencha o Estado, Cidade e Bairro. Após salvar, o Estado e a Cidade permanecem para o próximo bairro!
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveDeliveryNeighborhood} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* ESTADO */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Estado (UF) *
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="Ex: RN, SP"
                        value={deliveryState}
                        onChange={(e) => setDeliveryState(e.target.value.toUpperCase())}
                        required
                        className="w-full text-xs sm:text-sm uppercase font-bold p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-slate-50/50"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Permanece salvo</span>
                    </div>

                    {/* CIDADE */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Natal, São Paulo"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        required
                        className="w-full text-xs sm:text-sm font-bold p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-slate-50/50"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Permanece salvo</span>
                    </div>

                    {/* BAIRRO - Limpa após salvar */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-black text-amber-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Bairro *</span>
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                          Muda a cada cadastro
                        </span>
                      </label>
                      <input
                        ref={neighborhoodInputRef}
                        type="text"
                        placeholder="Ex: Centro, Ponta Negra..."
                        value={deliveryNeighborhood}
                        onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                        required
                        className="w-full text-xs sm:text-sm font-bold p-3 rounded-xl border-2 border-amber-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 outline-none bg-amber-50/20"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Limpa após salvar para digitar o próximo</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* VALOR DA TAXA */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Valor da Taxa (R$) * (0 para Grátis)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          placeholder="Ex: 6.50"
                          value={deliveryFeeValue}
                          onChange={(e) => setDeliveryFeeValue(e.target.value)}
                          required
                          className="w-full text-xs sm:text-sm pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-bold"
                        />
                      </div>
                    </div>

                    {/* TEMPO ESTIMADO */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Tempo Estimado de Entrega (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 30 - 45 min"
                        value={deliveryEstimatedTime}
                        onChange={(e) => setDeliveryEstimatedTime(e.target.value)}
                        className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* BOTÃO SALVAR */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Salvar Taxa de Entrega</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Bairros Cadastrados */}
              <div className="bg-white rounded-3xl border border-amber-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>Bairros Cadastrados ({ (localSettings.deliveryNeighborhoods || []).length })</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Taxas ativas aplicadas automaticamente no checkout do cliente
                    </p>
                  </div>

                  {/* Busca */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por bairro ou cidade..."
                      value={deliverySearchQuery}
                      onChange={(e) => setDeliverySearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Grid de Cards dos Bairros */}
                {(() => {
                  const list = (localSettings.deliveryNeighborhoods || []).filter((item) => {
                    if (!deliverySearchQuery.trim()) return true;
                    const q = deliverySearchQuery.toLowerCase();
                    return (
                      item.neighborhood.toLowerCase().includes(q) ||
                      item.city.toLowerCase().includes(q) ||
                      item.state.toLowerCase().includes(q)
                    );
                  });

                  if (list.length === 0) {
                    return (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl p-4">
                        <Bike className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">Nenhum bairro cadastrado com esse filtro.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Cadastre bairros no formulário acima para automatizar o frete.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {list.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/90 hover:border-amber-400 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-mono">
                                {item.state} • {item.city}
                              </span>
                              <span className="text-sm font-black font-mono text-slate-950">
                                {item.fee > 0 ? formatCurrency(item.fee) : 'Grátis'}
                              </span>
                            </div>

                            <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-900 transition-colors">
                              {item.neighborhood}
                            </h5>

                            {item.estimatedTime && (
                              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>{item.estimatedTime}</span>
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium">Taxa calculada</span>

                            {/* Botão de Excluir com Confirmação em Duas Etapas */}
                            <button
                              type="button"
                              onClick={() => {
                                setNeighborhoodToDelete(item);
                                setNeighborhoodDeleteStep(1);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                              title="Excluir taxa com confirmação em duas etapas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURAÇÕES DA LOJA (LOGO BASE64, INSTAGRAM, MODALIDADES E PAGAMENTOS) */}
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
                  Link oficial para o lojista e administradores realizarem login e gerenciarem os pedidos, financeiro, cardápio e configurações no Vercel.
                </p>

                {/* Input e Botão de Copiar Link de Login Oficial - Vercel */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Link de Login Oficial (Vercel):
                    </label>
                    <div className="flex items-center gap-2 p-2 rounded-2xl border border-amber-300 bg-amber-50/60">
                      <input
                        type="text"
                        readOnly
                        value={`${OFFICIAL_APP_URL}/?view=login`}
                        className="bg-transparent text-xs text-slate-900 font-bold flex-1 px-2 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const loginUrl = `${OFFICIAL_APP_URL}/?view=login`;
                          navigator.clipboard.writeText(loginUrl);
                          setCopiedLoginLink(true);
                          setTimeout(() => setCopiedLoginLink(false), 2500);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        {copiedLoginLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLoginLink ? 'Copiado!' : 'Copiar Link de Login'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Link Direto do Painel do CEO:
                    </label>
                    <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-300 bg-slate-50">
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
              </div>
            </div>
          )}

          {/* TAB 7: STATUS DE ANÁLISE E ATIVAÇÃO DA CONTA */}
          {activeTab === 'status' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center pb-2">
                <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center mb-3">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Status de Análise e Ativação da Conta
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Acompanhe em tempo real o status de revisão e liberação do seu acesso pela equipe técnica da SF Tecnologia.
                </p>
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-3xl border-2 border-amber-300 p-6 shadow-sm space-y-5">
                {(() => {
                  const account = accountService.getCurrentSession();
                  const status = account?.planStatus || 'pendente';
                  const isAtivo = status === 'ativo';
                  const isBloqueado = status === 'bloqueado';

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                            isAtivo ? 'bg-emerald-500 text-white' : isBloqueado ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-950'
                          }`}>
                            {isAtivo ? <CheckCircle2 className="w-6 h-6 stroke-[2.5]" /> : isBloqueado ? <AlertTriangle className="w-6 h-6 stroke-[2.5]" /> : <Clock className="w-6 h-6 stroke-[2.5]" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                              Situação Atual da Análise
                            </span>
                            <h4 className="text-base font-black text-slate-950 uppercase">
                              {isAtivo ? 'Conta Aprovada e Ativa' : isBloqueado ? 'Conta Suspensa / Bloqueada' : 'Em Análise pelo Suporte'}
                            </h4>
                          </div>
                        </div>

                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          isAtivo ? 'bg-emerald-100 text-emerald-800' : isBloqueado ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isAtivo ? 'Ativo' : isBloqueado ? 'Bloqueado' : 'Pendente (Em Análise)'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                        <p className="font-bold text-slate-900">
                          {isAtivo
                            ? 'Parabéns! Sua loja foi aprovada, e seu sistema digital está 100% operacional para receber pedidos de clientes.'
                            : isBloqueado
                            ? 'Sua conta está temporariamente suspensa por pendência ou verificação. Entre em contato com a SF Tecnologia para regularizar.'
                            : 'Sua solicitação de acesso foi enviada com sucesso. Nossa equipe técnica da SF Tecnologia está analisando seus dados para gerar suas credenciais definitivas.'}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Caso tenha urgência na liberação ou queira enviar comprovantes/dados adicionais, você pode falar diretamente com o suporte técnico pelo WhatsApp.
                        </p>
                      </div>

                      {/* Account Details */}
                      <div className="space-y-3 pt-2">
                        <h5 className="font-black text-xs uppercase tracking-wider text-slate-800">
                          Dados da Conta Cadastrada:
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Estabelecimento</span>
                            <strong className="text-slate-900 text-sm">{account?.storeName || settings.storeName}</strong>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Responsável</span>
                            <strong className="text-slate-900 text-sm">{account?.name || 'Não informado'}</strong>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Usuário de Acesso</span>
                            <code className="text-slate-900 font-mono font-bold">{account?.username || 'N/A'}</code>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">WhatsApp de Contato</span>
                            <span className="text-slate-900 font-bold">{account?.phoneWhatsapp || settings.phoneWhatsapp || 'Não informado'}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Support Action */}
                      <div className="pt-2">
                        <a
                          href={`https://wa.me/5584986113980?text=${encodeURIComponent(`*CONSULTA DE STATUS DE ANÁLISE - CARDAPP*\n\n• Loja: ${account?.storeName}\n• Responsável: ${account?.name}\n• Usuário: ${account?.username}\n\nOlá! Gostaria de consultar o status da minha análise e liberação de acesso.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>Falar com o Suporte Técnico (WhatsApp)</span>
                        </a>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer SF TECNOLOGIA */}
        <div className="bg-slate-900 text-slate-400 py-2.5 px-4 text-center text-[10px] font-bold border-t border-slate-800 shrink-0">
          CARDAPP • Desenvolvido por SF TECNOLOGIA • Todos os direitos reservados
        </div>
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

      {/* TWO-STEP CONFIRMATION MODAL TO DELETE NEIGHBORHOOD DELIVERY FEE */}
      {neighborhoodToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-amber-300 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mb-0.5">
                  {neighborhoodDeleteStep === 1
                    ? 'Confirmação de Exclusão (1/2)'
                    : 'Confirmação Definitiva (2/2)'}
                </span>
                <h3 className="text-base font-black text-slate-950">
                  {neighborhoodDeleteStep === 1
                    ? 'Excluir Taxa de Bairro?'
                    : 'Confirmar Remoção Permanente'}
                </h3>
              </div>
            </div>

            {neighborhoodDeleteStep === 1 ? (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Você deseja remover a taxa de entrega configurada para o bairro{' '}
                  <strong className="text-slate-950">"{neighborhoodToDelete.neighborhood}"</strong> em{' '}
                  <strong className="text-slate-950">{neighborhoodToDelete.city} - {neighborhoodToDelete.state}</strong>{' '}
                  (Valor atual: {neighborhoodToDelete.fee > 0 ? formatCurrency(neighborhoodToDelete.fee) : 'Grátis'})?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNeighborhoodToDelete(null);
                      setNeighborhoodDeleteStep(1);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeighborhoodDeleteStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs cursor-pointer"
                  >
                    Prosseguir para Confirmação Final →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 font-medium">
                  Atenção: Ao confirmar, pedidos enviados para <strong>"{neighborhoodToDelete.neighborhood}"</strong> voltarão a usar a taxa padrão da loja.
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNeighborhoodToDelete(null);
                      setNeighborhoodDeleteStep(1);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Voltar / Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteNeighborhood}
                    className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Taxa!</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
                    {printOrder.customer.address.complement ? ` (${printOrder.customer.address.complement})` : ''} - {printOrder.customer.address.city}{printOrder.customer.address.state ? `/${printOrder.customer.address.state}` : ''}
                    {printOrder.customer.address.cep ? ` [CEP: ${printOrder.customer.address.cep}]` : ''}
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

      {/* MODAL DE CONFIRMAÇÃO DE DUAS ETAPAS PARA SAIR DA CONTA DO CEO */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full border-2 border-amber-300 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {logoutConfirmationStep === 1 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                  <LogOut className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 inline-block">
                    Etapa 1 de 2 • Confirmação de Saída
                  </span>
                  <h3 className="text-lg font-black text-slate-950">
                    Deseja sair da conta do CEO?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Você está prestes a sair do painel administrativo da loja <strong>{settings.storeName}</strong>. Deseja prosseguir para a confirmação final?
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoutConfirmationStep(2)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    Avançar para Etapa 2
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
                  <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 inline-block">
                    Etapa 2 de 2 • Confirmação Final
                  </span>
                  <h3 className="text-lg font-black text-red-950">
                    Tem certeza absoluta?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Sua sessão no painel do CEO será encerrada. Para retornar, será necessário digitar suas credenciais de acesso novamente.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogoutConfirmationStep(1)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogoutModalOpen(false);
                      setLogoutConfirmationStep(1);
                      if (onLogout) onLogout();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Confirmar e Sair</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
