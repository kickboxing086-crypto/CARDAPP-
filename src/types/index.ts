export type OrderStatus = 'recebido' | 'em_producao' | 'em_rota' | 'finalizado';

export interface Category {
  id: string;
  name: string;
}

export interface ProductComplement {
  id: string;
  name: string;
  price: number; // 0 for free, or extra value
}

export interface ProductPromotion {
  enabled: boolean;
  promoQuantity: number; // e.g. 2
  promoPrice: number;    // e.g. 8.00 (while 1 is 5.00)
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string; // Base64 data URL or empty
  isPopular?: boolean;
  isAvailable: boolean;
  promotion?: ProductPromotion;
  complements?: ProductComplement[];
}

export interface SelectedComplement {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  selectedComplements?: SelectedComplement[];
  appliedPromotion?: {
    promoQuantity: number;
    promoPrice: number;
    savings: number;
  };
  totalPrice: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  deliveryType: 'delivery' | 'retirada' | 'mesa';
  tableNumber?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
  };
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  cashGiven?: number; // valor entregue pelo cliente em dinheiro
  changeToReturn?: number; // valor do troco calculado automaticamente que a loja deve levar
}

export interface Order {
  id: string;
  displayId: string; // e.g. #CARD-1042
  createdAt: string; // ISO string
  dateKey: string;   // e.g. YYYY-MM-DD for grouping
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: OrderCustomer;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
}

export interface StoreServiceModes {
  allowDelivery: boolean;
  allowRetirada: boolean;
  allowMesa: boolean;
}

export interface StorePaymentMethods {
  allowPix: boolean;
  allowCreditCard: boolean;
  allowDebitCard: boolean;
  allowCash: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoBase64?: string;
  instagramHandle: string;
  phoneWhatsapp: string;
  address: string;
  isOpen: boolean;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  pixKey: string;
  pixKeyType: 'cnpj' | 'cpf' | 'telefone' | 'email' | 'aleatoria';
  serviceModes: StoreServiceModes;
  paymentMethods: StorePaymentMethods;
  minOrderValue: number;
}

// User accounts and multi-tenant authentication
export interface UserAccount {
  id: string;
  username: string; // Validated: uppercase, lowercase, number, special char
  passwordHash: string; // Stored securely
  role: 'super_admin' | 'store_admin';
  name: string;
  storeId: string;
  storeName: string;
  planStatus: 'ativo' | 'pendente' | 'bloqueado';
  monthlyFee: number; // 24.99
  phoneWhatsapp?: string;
  createdAt: string;
  expiresAt: string;
}

export interface SecurityRequirements {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
  isValid: boolean;
}
