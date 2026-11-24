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
  updatedAt?: string;
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
    cep?: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
    state?: string;
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

export interface NeighborhoodDeliveryFee {
  id: string;
  state: string;        // e.g. "RN" ou "SP"
  city: string;         // e.g. "Natal"
  neighborhood: string; // e.g. "Centro"
  fee: number;          // e.g. 5.00
  estimatedTime?: string; // e.g. "30-45 min"
}

export interface OperatingHours {
  openTime: string;
  closeTime: string;
  hasBreak?: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface StoreOperatingHours {
  monday?: OperatingHours;
  tuesday?: OperatingHours;
  wednesday?: OperatingHours;
  thursday?: OperatingHours;
  friday?: OperatingHours;
  saturday?: OperatingHours;
  sunday?: OperatingHours;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoBase64?: string;
  instagramHandle: string;
  phoneWhatsapp: string;
  address: string;
  isOpen: boolean;
  operatingHours?: StoreOperatingHours;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  pixKey: string;
  pixKeyType: 'cnpj' | 'cpf' | 'telefone' | 'email' | 'aleatoria';
  serviceModes: StoreServiceModes;
  paymentMethods: StorePaymentMethods;
  minOrderValue: number;
  deliveryNeighborhoods?: NeighborhoodDeliveryFee[];
  tables?: string[];
  fontFamily?: string;
}

export type PlanPeriod = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio';
export type PlanTier = 'teste_gratis' | PlanPeriod;

export interface SubscriptionPlan {
  id: string;
  period: PlanPeriod;
  name: string;
  durationDays: number; // 30, 90, 180, 365, ou 36500 (vitalicio)
  price: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

// User accounts and multi-tenant authentication
export interface UserAccount {
  id: string;
  username: string; // Validated: uppercase, lowercase, number, special char
  passwordHash: string; // Stored securely (SHA-256 salted hash)
  plainPassword?: string; // Senha real do lojista em texto aberto para o Administrador Geral
  password?: string; // Sinônimo para compatibilidade total
  plainPasswordEncrypted?: string; // Reversible salted encrypted password for SuperAdmin viewing upon 2-step verification
  authUid?: string; // Firebase Auth UID vinculado para validação nas Firestore Rules
  role: 'super_admin' | 'store_admin';
  name: string;
  email?: string;
  emailVerified?: boolean;
  storeId: string;
  storeName: string;
  planStatus: 'ativo' | 'pendente' | 'bloqueado';
  planTier?: PlanTier;
  planName?: string;
  blockedReason?: string;
  monthlyFee: number;
  phoneWhatsapp?: string;
  createdAt: string;
  expiresAt: string;
  invoices?: PaymentInvoice[];
}

export interface PaymentInvoice {
  id: string;
  accountId: string;
  storeName?: string;
  amount: number;
  paymentMethod: 'PIX';
  status: 'confirmado' | 'pago';
  paidAt: string;
  validUntil: string;
  protocol: string;
  description: string;
}

export interface ClientRegistrationFormData {
  name: string;
  email: string;
  phoneWhatsapp: string;
  storeName: string;
  logoBase64: string;
  address?: string;
  tagline?: string;
  instagramHandle?: string;
  username: string;
  password: string;
}

export interface UserAccessRequest {
  id: string;
  name: string;
  email: string;
  phoneWhatsapp: string;
  storeName: string;
  createdAt: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

export interface EmailVerificationSession {
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  registrationData: ClientRegistrationFormData;
}

export interface SecurityRequirements {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
  hasMaxLength: boolean;
  isValid: boolean;
}

export interface UsernameSecurityRequirements {
  hasMinLength: boolean;     // Pelo menos 4 caracteres
  hasMaxLength: boolean;     // Máximo de 8 caracteres (até 8)
  hasUppercase: boolean;     // Pelo menos 1 letra maiúscula (A-Z)
  hasLowercase: boolean;     // Pelo menos 1 letra minúscula (a-z)
  hasNumber: boolean;        // Pelo menos 1 número (0-9)
  hasSpecialChar: boolean;   // Pelo menos 1 caractere especial (@, #, $, %, etc.)
  hasNoAccents: boolean;     // Proibido acentos, cedilhas ou til
  hasNoSpaces: boolean;      // Proibido espaços
  isValid: boolean;
}

export interface PasswordSecurityRequirements {
  hasMinLength: boolean;     // Pelo menos 4 caracteres
  hasMaxLength: boolean;     // Máximo de 8 caracteres (até 8)
  hasUppercase: boolean;     // Pelo menos 1 letra maiúscula (A-Z)
  hasLowercase: boolean;     // Pelo menos 1 letra minúscula (a-z)
  hasNumber: boolean;        // Pelo menos 1 número (0-9)
  hasSpecialChar: boolean;   // Pelo menos 1 caractere especial (@, #, $, %, etc.)
  hasNoAccents: boolean;     // Proibido acentos, cedilhas e caracteres com til/crase
  hasNoSpaces: boolean;      // Proibido espaços
  isValid: boolean;
  score: number;             // Pontuação de 0 a 100
  strengthLabel: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente';
}
