import {
  CartItem,
  Product,
  ProductComplement,
  SelectedComplement,
  StoreSettings,
  PlanTier,
  PlanPeriod,
} from '../types';

export type AppViewMode = 'landing' | 'menu' | 'login';
export type CeoTabMode = 'orders' | 'finance' | 'products' | 'delivery' | 'settings' | 'share' | 'status';
export type SuperAdminTabMode =
  | 'dashboard'
  | 'users'
  | 'stores'
  | 'renewals'
  | 'blocking'
  | 'plans'
  | 'generator'
  | 'requests'
  | 'reports'
  | 'database';

export interface CheckoutFormDraft {
  name: string;
  phone: string;
  deliveryType: 'delivery' | 'retirada' | 'mesa';
  tableNumber: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  stateUf: string;
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  cashGivenInput: string;
}

export interface ProductCustomizerDraft {
  productId: string;
  quantity: number;
  notes: string;
  selectedComplements: SelectedComplement[];
}

export interface ClientMenuFiltersDraft {
  selectedCategory: string;
  searchQuery: string;
  isStoreInfoOpen: boolean;
}

export interface CeoProductFormDraft {
  isOpen: boolean;
  editingProductId: string | null;
  prodName: string;
  prodCategory: string;
  prodPrice: string;
  prodDescription: string;
  prodImageBase64: string;
  prodAvailable: boolean;
  hasPromo: boolean;
  promoQty: string;
  promoPrice: string;
  complementsList: ProductComplement[];
  newCompName: string;
  newCompPrice: string;
}

export interface CeoDeliveryDraft {
  deliveryState: string;
  deliveryCity: string;
  deliveryNeighborhood: string;
  deliveryFeeValue: string;
  deliveryEstimatedTime: string;
  deliverySearchQuery: string;
}

export interface LoginModalDraft {
  activeMode: 'login' | 'register' | 'recover';
  loginUsername: string;
  wizardStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  regName: string;
  regStoreName: string;
  regAddress: string;
  regTagline: string;
  regInstagram: string;
  regLogoBase64: string;
  regPhone: string;
  regEmail: string;
  regUsername: string;
  recoverStep: 1 | 2 | 3;
  recoverIdentifier: string;
}

export interface SuperAdminGeneratorDraft {
  newStoreName: string;
  newOwnerName: string;
  newUsername: string;
  newPhone: string;
  newEmail: string;
  newAccountPlanTier: PlanTier;
}

function getStorageSafe(kind: 'session' | 'local'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function isBrowserPageReload(): boolean {
  try {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
    const entries = performance.getEntriesByType?.('navigation');
    if (entries && entries.length > 0) {
      const nav = entries[0] as PerformanceNavigationTiming;
      return nav.type === 'reload';
    }
    const legacyNav = (performance as unknown as { navigation?: { type?: number } }).navigation;
    return legacyNav?.type === 1;
  } catch {
    return false;
  }
}

function safeSetItem(storage: Storage | null, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveItem(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function safeSetJson(key: string, value: unknown, preferBoth = true): void {
  const serialized = JSON.stringify(value);
  safeSetItem(getStorageSafe('session'), key, serialized);
  if (preferBoth) {
    safeSetItem(getStorageSafe('local'), key, serialized);
  }
}

function safeGetJson<T>(key: string): T | null {
  const sessionRaw = safeGetItem(getStorageSafe('session'), key);
  if (sessionRaw) {
    try {
      return JSON.parse(sessionRaw) as T;
    } catch {
      // ignore
    }
  }
  const localRaw = safeGetItem(getStorageSafe('local'), key);
  if (localRaw) {
    try {
      return JSON.parse(localRaw) as T;
    } catch {
      // ignore
    }
  }
  return null;
}

function safeRemoveEverywhere(key: string): void {
  safeRemoveItem(getStorageSafe('session'), key);
  safeRemoveItem(getStorageSafe('local'), key);
}

// ============================================================
// SLUG CACHE (Resolves shared store URLs synchronously on reload)
// ============================================================
const SLUG_CACHE_KEY = 'cardapp_slug_map_v1';

export function cacheStoreTargetResolution(
  target: string,
  storeId: string,
  storeName?: string
): void {
  const cleanTarget = (target || '').trim().toLowerCase();
  if (!cleanTarget || !storeId) return;
  const map = safeGetJson<Record<string, { storeId: string; storeName?: string }>>(SLUG_CACHE_KEY) || {};
  map[cleanTarget] = { storeId, storeName };
  safeSetItem(getStorageSafe('local'), SLUG_CACHE_KEY, JSON.stringify(map));
}

export function getCachedStoreTarget(
  target: string
): { storeId: string; storeName?: string } | null {
  const cleanTarget = (target || '').trim().toLowerCase();
  if (!cleanTarget) return null;
  const raw = safeGetItem(getStorageSafe('local'), SLUG_CACHE_KEY);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, { storeId: string; storeName?: string }>;
    return map[cleanTarget] || null;
  } catch {
    return null;
  }
}

// ============================================================
// APP VIEW & MODAL ROUTE FLAGS
// ============================================================
export function saveActiveStoreSession(storeId: string): void {
  const cleanId = storeId || 'default_store';
  safeSetItem(getStorageSafe('session'), 'cardapp_active_store_id', cleanId);
  safeSetItem(getStorageSafe('local'), 'cardapp_last_store_id', cleanId);
}

export function getSavedActiveStoreId(): string {
  return (
    safeGetItem(getStorageSafe('session'), 'cardapp_active_store_id') ||
    safeGetItem(getStorageSafe('local'), 'cardapp_last_store_id') ||
    'default_store'
  );
}

export function saveAppView(view: AppViewMode): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_current_view', view);
  if (view === 'landing' || view === 'login') {
    safeSetItem(getStorageSafe('local'), 'cardapp_last_view', view);
  }
}

export function getSavedAppView(): AppViewMode | null {
  const s = safeGetItem(getStorageSafe('session'), 'cardapp_current_view');
  if (s === 'landing' || s === 'menu' || s === 'login') return s;
  if (isBrowserPageReload()) {
    const l = safeGetItem(getStorageSafe('local'), 'cardapp_last_view');
    if (l === 'ceo' || l === 'superadmin' || l === 'menu') return 'menu';
    if (l === 'landing' || l === 'login') return l;
  }
  return null;
}

export function saveCeoOpenState(isOpen: boolean): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_ceo_open', isOpen ? 'true' : 'false');
  if (isOpen) {
    safeSetItem(getStorageSafe('session'), 'cardapp_superadmin_open', 'false');
    safeSetItem(getStorageSafe('local'), 'cardapp_last_view', 'ceo');
  }
}

export function getSavedCeoOpenState(): boolean | null {
  const s = safeGetItem(getStorageSafe('session'), 'cardapp_ceo_open');
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (isBrowserPageReload()) {
    const l = safeGetItem(getStorageSafe('local'), 'cardapp_last_view');
    if (l === 'ceo') return true;
  }
  return null;
}

export function saveSuperAdminOpenState(isOpen: boolean): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_superadmin_open', isOpen ? 'true' : 'false');
  if (isOpen) {
    safeSetItem(getStorageSafe('session'), 'cardapp_ceo_open', 'false');
    safeSetItem(getStorageSafe('local'), 'cardapp_last_view', 'superadmin');
  }
}

export function getSavedSuperAdminOpenState(): boolean | null {
  const s = safeGetItem(getStorageSafe('session'), 'cardapp_superadmin_open');
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (isBrowserPageReload()) {
    const l = safeGetItem(getStorageSafe('local'), 'cardapp_last_view');
    if (l === 'superadmin') return true;
  }
  return null;
}

export function clearAdminModalOpenStates(): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_ceo_open', 'false');
  safeSetItem(getStorageSafe('session'), 'cardapp_superadmin_open', 'false');
}

// ============================================================
// CUSTOMER (CLIENTE) PER-STORE STATE PERSISTENCE
// ============================================================
function getStoreScope(storeId?: string): string {
  return (storeId || 'default_store').trim() || 'default_store';
}

export function saveClientStep(storeId: string, step: 1 | 2 | 3 | 4): void {
  const scope = getStoreScope(storeId);
  safeSetItem(getStorageSafe('session'), 'cardapp_current_step', String(step));
  safeSetItem(getStorageSafe('session'), `cardapp_client_step_${scope}`, String(step));
  safeSetItem(getStorageSafe('local'), `cardapp_client_step_${scope}`, String(step));
}

export function loadClientStep(storeId: string): 1 | 2 | 3 | 4 {
  const scope = getStoreScope(storeId);
  const s =
    safeGetItem(getStorageSafe('session'), `cardapp_client_step_${scope}`) ||
    safeGetItem(getStorageSafe('local'), `cardapp_client_step_${scope}`) ||
    safeGetItem(getStorageSafe('session'), 'cardapp_current_step');
  if (s && ['1', '2', '3', '4'].includes(s)) {
    return Number(s) as 1 | 2 | 3 | 4;
  }
  return 1;
}

export function saveClientCart(storeId: string, items: CartItem[]): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_client_cart_${scope}`;
  const fullJson = JSON.stringify(items);
  safeSetItem(getStorageSafe('session'), key, fullJson);
  if (!safeSetItem(getStorageSafe('local'), key, fullJson)) {
    // Quota fallback: strip base64 images from cart items (rehydrated from products list on load)
    const compactItems = items.map((item) => ({
      ...item,
      product: item.product?.image?.startsWith('data:')
        ? { ...item.product, image: '' }
        : item.product,
    }));
    const compactJson = JSON.stringify(compactItems);
    safeSetItem(getStorageSafe('local'), key, compactJson);
  }
}

export function loadClientCart(storeId: string, availableProducts: Product[] = []): CartItem[] {
  const scope = getStoreScope(storeId);
  const key = `cardapp_client_cart_${scope}`;
  const parsed = safeGetJson<CartItem[]>(key);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && item.product && typeof item.quantity === 'number' && item.quantity > 0)
    .map((item) => {
      const liveProd = availableProducts.find((p) => p.id === item.product.id);
      if (liveProd) {
        return {
          ...item,
          product: {
            ...item.product,
            image: item.product.image || liveProd.image || '',
          },
        };
      }
      return item;
    });
}

export function clearClientCart(storeId: string): void {
  const scope = getStoreScope(storeId);
  safeRemoveEverywhere(`cardapp_client_cart_${scope}`);
}

export function saveClientMenuFilters(storeId: string, filters: ClientMenuFiltersDraft): void {
  const scope = getStoreScope(storeId);
  safeSetJson(`cardapp_client_filters_${scope}`, filters, true);
}

export function loadClientMenuFilters(storeId: string): ClientMenuFiltersDraft {
  const scope = getStoreScope(storeId);
  const saved = safeGetJson<Partial<ClientMenuFiltersDraft>>(`cardapp_client_filters_${scope}`);
  return {
    selectedCategory: typeof saved?.selectedCategory === 'string' ? saved.selectedCategory : 'todos',
    searchQuery: typeof saved?.searchQuery === 'string' ? saved.searchQuery : '',
    isStoreInfoOpen: Boolean(saved?.isStoreInfoOpen),
  };
}

export function saveCustomizerDraft(storeId: string, draft: ProductCustomizerDraft | null): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_client_customizer_${scope}`;
  if (!draft) {
    safeRemoveEverywhere(key);
    return;
  }
  safeSetJson(key, draft, true);
}

export function loadCustomizerDraft(storeId: string): ProductCustomizerDraft | null {
  const scope = getStoreScope(storeId);
  const saved = safeGetJson<ProductCustomizerDraft>(`cardapp_client_customizer_${scope}`);
  if (!saved || !saved.productId) return null;
  return saved;
}

export function saveCheckoutDraft(storeId: string, draft: CheckoutFormDraft): void {
  const scope = getStoreScope(storeId);
  safeSetJson(`cardapp_checkout_draft_${scope}`, draft, true);
}

export function loadCheckoutDraft(storeId: string): Partial<CheckoutFormDraft> | null {
  const scope = getStoreScope(storeId);
  return safeGetJson<Partial<CheckoutFormDraft>>(`cardapp_checkout_draft_${scope}`);
}

export function clearCheckoutCashDraft(storeId: string): void {
  const scope = getStoreScope(storeId);
  const current = loadCheckoutDraft(scope);
  if (current) {
    saveCheckoutDraft(scope, {
      name: current.name || '',
      phone: current.phone || '',
      deliveryType: current.deliveryType || 'delivery',
      tableNumber: current.tableNumber || '',
      cep: current.cep || '',
      street: current.street || '',
      number: current.number || '',
      neighborhood: current.neighborhood || '',
      complement: current.complement || '',
      city: current.city || 'São Paulo',
      stateUf: current.stateUf || '',
      paymentMethod: current.paymentMethod || 'pix',
      cashGivenInput: '',
    });
  }
}

// ============================================================
// CEO ADMIN PANEL PERSISTENCE (PER STORE)
// ============================================================
export function saveCeoActiveTab(storeId: string, tab: CeoTabMode): void {
  const scope = getStoreScope(storeId);
  safeSetItem(getStorageSafe('session'), 'cardapp_ceo_active_tab', tab);
  safeSetItem(getStorageSafe('local'), 'cardapp_ceo_active_tab', tab);
  safeSetItem(getStorageSafe('session'), `cardapp_ceo_tab_${scope}`, tab);
  safeSetItem(getStorageSafe('local'), `cardapp_ceo_tab_${scope}`, tab);
}

export function loadCeoActiveTab(storeId: string): CeoTabMode | null {
  const scope = getStoreScope(storeId);
  const valid: CeoTabMode[] = ['orders', 'finance', 'products', 'delivery', 'settings', 'share', 'status'];
  const s =
    safeGetItem(getStorageSafe('session'), `cardapp_ceo_tab_${scope}`) ||
    safeGetItem(getStorageSafe('local'), `cardapp_ceo_tab_${scope}`) ||
    safeGetItem(getStorageSafe('session'), 'cardapp_ceo_active_tab') ||
    safeGetItem(getStorageSafe('local'), 'cardapp_ceo_active_tab');
  if (s && valid.includes(s as CeoTabMode)) return s as CeoTabMode;
  return null;
}

export function saveCeoOrderFilter(storeId: string, filter: string): void {
  const scope = getStoreScope(storeId);
  safeSetItem(getStorageSafe('session'), 'cardapp_ceo_order_filter', filter);
  safeSetItem(getStorageSafe('session'), `cardapp_ceo_order_filter_${scope}`, filter);
  safeSetItem(getStorageSafe('local'), `cardapp_ceo_order_filter_${scope}`, filter);
}

export function loadCeoOrderFilter(storeId: string): string | null {
  const scope = getStoreScope(storeId);
  return (
    safeGetItem(getStorageSafe('session'), `cardapp_ceo_order_filter_${scope}`) ||
    safeGetItem(getStorageSafe('local'), `cardapp_ceo_order_filter_${scope}`) ||
    safeGetItem(getStorageSafe('session'), 'cardapp_ceo_order_filter')
  );
}

export function saveCeoOrderSearch(storeId: string, query: string): void {
  const scope = getStoreScope(storeId);
  safeSetItem(getStorageSafe('session'), `cardapp_ceo_order_search_${scope}`, query);
  safeSetItem(getStorageSafe('local'), `cardapp_ceo_order_search_${scope}`, query);
}

export function loadCeoOrderSearch(storeId: string): string {
  const scope = getStoreScope(storeId);
  return (
    safeGetItem(getStorageSafe('session'), `cardapp_ceo_order_search_${scope}`) ||
    safeGetItem(getStorageSafe('local'), `cardapp_ceo_order_search_${scope}`) ||
    ''
  );
}

export function saveCeoNewCategoryInput(storeId: string, val: string): void {
  const scope = getStoreScope(storeId);
  safeSetItem(getStorageSafe('session'), `cardapp_ceo_new_cat_${scope}`, val);
}

export function loadCeoNewCategoryInput(storeId: string): string {
  const scope = getStoreScope(storeId);
  return safeGetItem(getStorageSafe('session'), `cardapp_ceo_new_cat_${scope}`) || '';
}

export function saveCeoProductFormDraft(storeId: string, draft: CeoProductFormDraft | null): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_ceo_product_draft_${scope}`;
  if (!draft || !draft.isOpen) {
    safeRemoveEverywhere(key);
    return;
  }
  const serialized = JSON.stringify(draft);
  safeSetItem(getStorageSafe('session'), key, serialized);
  if (!safeSetItem(getStorageSafe('local'), key, serialized)) {
    const withoutImg = { ...draft, prodImageBase64: '' };
    safeSetItem(getStorageSafe('local'), key, JSON.stringify(withoutImg));
  }
}

export function loadCeoProductFormDraft(storeId: string): CeoProductFormDraft | null {
  const scope = getStoreScope(storeId);
  const saved = safeGetJson<CeoProductFormDraft>(`cardapp_ceo_product_draft_${scope}`);
  if (!saved || !saved.isOpen) return null;
  return saved;
}

export function saveCeoDeliveryDraft(storeId: string, draft: CeoDeliveryDraft): void {
  const scope = getStoreScope(storeId);
  safeSetJson(`cardapp_ceo_delivery_draft_${scope}`, draft, true);
}

export function loadCeoDeliveryDraft(storeId: string): Partial<CeoDeliveryDraft> | null {
  const scope = getStoreScope(storeId);
  return safeGetJson<Partial<CeoDeliveryDraft>>(`cardapp_ceo_delivery_draft_${scope}`);
}

export function saveCeoSettingsDraft(storeId: string, draft: StoreSettings | null): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_ceo_settings_draft_${scope}`;
  if (!draft) {
    safeRemoveEverywhere(key);
    return;
  }
  safeSetJson(key, draft, true);
}

export function loadCeoSettingsDraft(storeId: string): StoreSettings | null {
  const scope = getStoreScope(storeId);
  return safeGetJson<StoreSettings>(`cardapp_ceo_settings_draft_${scope}`);
}

export function saveCeoPrintOrderId(storeId: string, orderId: string | null): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_ceo_print_order_${scope}`;
  if (!orderId) {
    safeRemoveEverywhere(key);
  } else {
    safeSetItem(getStorageSafe('session'), key, orderId);
  }
}

export function loadCeoPrintOrderId(storeId: string): string | null {
  const scope = getStoreScope(storeId);
  return safeGetItem(getStorageSafe('session'), `cardapp_ceo_print_order_${scope}`);
}

export function saveCeoSelectedRenewalPlan(storeId: string, plan: PlanPeriod): void {
  const scope = getStoreScope(storeId);
  const key = `cardapp_ceo_renewal_plan_${scope}`;
  safeSetItem(getStorageSafe('session'), key, plan);
  safeSetItem(getStorageSafe('local'), key, plan);
}

export function loadCeoSelectedRenewalPlan(storeId: string): PlanPeriod | null {
  const scope = getStoreScope(storeId);
  const key = `cardapp_ceo_renewal_plan_${scope}`;
  const valid: PlanPeriod[] = ['mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'];
  const val = safeGetItem(getStorageSafe('session'), key) || safeGetItem(getStorageSafe('local'), key);
  if (val && valid.includes(val as PlanPeriod)) return val as PlanPeriod;
  return null;
}

// ============================================================
// SUPER ADMIN & LOGIN PERSISTENCE
// ============================================================
export function saveSuperAdminTab(tab: SuperAdminTabMode): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_superadmin_tab', tab);
  safeSetItem(getStorageSafe('local'), 'cardapp_superadmin_tab', tab);
}

export function loadSuperAdminTab(): SuperAdminTabMode | null {
  const valid: SuperAdminTabMode[] = [
    'dashboard',
    'users',
    'stores',
    'renewals',
    'blocking',
    'plans',
    'generator',
    'requests',
    'reports',
    'database',
  ];
  const val =
    safeGetItem(getStorageSafe('session'), 'cardapp_superadmin_tab') ||
    safeGetItem(getStorageSafe('local'), 'cardapp_superadmin_tab');
  if (val && valid.includes(val as SuperAdminTabMode)) return val as SuperAdminTabMode;
  return null;
}

export function saveSuperAdminFilters(search: string, status: string): void {
  safeSetJson('cardapp_superadmin_filters', { search, status }, true);
}

export function loadSuperAdminFilters(): { search: string; status: string } | null {
  return safeGetJson<{ search: string; status: string }>('cardapp_superadmin_filters');
}

export function saveSuperAdminDrawerState(accountId: string | null, tab: 'actions' | 'edit'): void {
  if (!accountId) {
    safeRemoveEverywhere('cardapp_superadmin_drawer');
    return;
  }
  safeSetJson('cardapp_superadmin_drawer', { accountId, tab }, false);
}

export function loadSuperAdminDrawerState(): { accountId: string; tab: 'actions' | 'edit' } | null {
  return safeGetJson<{ accountId: string; tab: 'actions' | 'edit' }>('cardapp_superadmin_drawer');
}

export function saveSuperAdminGeneratorDraft(draft: SuperAdminGeneratorDraft | null): void {
  if (!draft) {
    safeRemoveEverywhere('cardapp_superadmin_gen_draft');
    return;
  }
  safeSetJson('cardapp_superadmin_gen_draft', draft, false);
}

export function loadSuperAdminGeneratorDraft(): Partial<SuperAdminGeneratorDraft> | null {
  return safeGetJson<Partial<SuperAdminGeneratorDraft>>('cardapp_superadmin_gen_draft');
}

export function saveLoginModalDraft(draft: LoginModalDraft | null): void {
  if (!draft) {
    safeRemoveEverywhere('cardapp_login_draft_v1');
    return;
  }
  const serialized = JSON.stringify(draft);
  if (!safeSetItem(getStorageSafe('session'), 'cardapp_login_draft_v1', serialized)) {
    const compact = { ...draft, regLogoBase64: '' };
    safeSetItem(getStorageSafe('session'), 'cardapp_login_draft_v1', JSON.stringify(compact));
  }
}

export function loadLoginModalDraft(): Partial<LoginModalDraft> | null {
  const raw = safeGetItem(getStorageSafe('session'), 'cardapp_login_draft_v1');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<LoginModalDraft>;
  } catch {
    return null;
  }
}

export function setExplicitLoginModeOverride(mode: 'login' | 'register'): void {
  safeSetItem(getStorageSafe('session'), 'cardapp_login_explicit_mode', mode);
}

export function peekExplicitLoginModeOverride(): 'login' | 'register' | null {
  const val = safeGetItem(getStorageSafe('session'), 'cardapp_login_explicit_mode');
  if (val === 'login' || val === 'register') return val;
  return null;
}

export function consumeExplicitLoginModeOverride(): 'login' | 'register' | null {
  const val = safeGetItem(getStorageSafe('session'), 'cardapp_login_explicit_mode');
  if (val === 'login' || val === 'register') {
    safeRemoveItem(getStorageSafe('session'), 'cardapp_login_explicit_mode');
    return val;
  }
  return null;
}
