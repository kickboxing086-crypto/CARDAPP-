import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Bike,
  Store,
  QrCode,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
  MapPin,
  Navigation,
  Search,
  Loader2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CartItem, StoreSettings, OrderCustomer } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generatePixPayload, extractCleanPixKey } from '../utils/pixPayload';
import {
  fetchAddressByCep,
  fetchAddressByCoordinates,
  formatCep,
} from '../utils/addressService';
import { storageService } from '../services/storageService';
import {
  loadCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutCashDraft,
} from '../utils/viewStatePersistence';

interface CheckoutStepProps {
  items: CartItem[];
  settings: StoreSettings;
  storeId?: string;
  onBackToCart: () => void;
  onSubmitOrder: (customerData: OrderCustomer) => void;
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  items,
  settings,
  storeId,
  onBackToCart,
  onSubmitOrder,
}) => {
  const effectiveStoreId = storeId || storageService.currentStoreId || 'default_store';
  const initialDraft = useMemo(() => loadCheckoutDraft(effectiveStoreId), [effectiveStoreId]);

  const [name, setName] = useState(() => initialDraft?.name || '');
  const [phone, setPhone] = useState(() => initialDraft?.phone || '');

  // Service modes available from settings
  const { allowDelivery, allowRetirada, allowMesa } = settings.serviceModes;
  const initialMode = allowDelivery ? 'delivery' : allowRetirada ? 'retirada' : 'mesa';
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retirada' | 'mesa'>(() => {
    const d = initialDraft?.deliveryType;
    if (d === 'delivery' && allowDelivery) return 'delivery';
    if (d === 'retirada' && allowRetirada) return 'retirada';
    if (d === 'mesa' && allowMesa) return 'mesa';
    return initialMode;
  });
  const [tableNumber, setTableNumber] = useState(() => initialDraft?.tableNumber || '');

  // Address
  const [cep, setCep] = useState(() => initialDraft?.cep || '');
  const [street, setStreet] = useState(() => initialDraft?.street || '');
  const [number, setNumber] = useState(() => initialDraft?.number || '');
  const [neighborhood, setNeighborhood] = useState(() => initialDraft?.neighborhood || '');
  const [complement, setComplement] = useState(() => initialDraft?.complement || '');
  const [city, setCity] = useState(() => initialDraft?.city || 'São Paulo');
  const [stateUf, setStateUf] = useState(() => initialDraft?.stateUf || '');

  // Real-time location and CEP states
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const numberInputRef = useRef<HTMLInputElement>(null);

  // Payment methods available from settings
  const { allowPix, allowCreditCard, allowDebitCard, allowCash } = settings.paymentMethods;
  const initialPayment = allowPix ? 'pix' : allowCreditCard ? 'cartao_credito' : allowDebitCard ? 'cartao_debito' : 'dinheiro';
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>(() => {
    const p = initialDraft?.paymentMethod;
    if (p === 'pix' && allowPix) return 'pix';
    if (p === 'cartao_credito' && allowCreditCard) return 'cartao_credito';
    if (p === 'cartao_debito' && allowDebitCard) return 'cartao_debito';
    if (p === 'dinheiro' && allowCash) return 'dinheiro';
    return initialPayment;
  });
  
  // Cash & Change calculation
  const [cashGivenInput, setCashGivenInput] = useState(() => initialDraft?.cashGivenInput || '');
  const [error, setError] = useState<string | null>(null);

  // Persistir rascunho de checkout em tempo real para não perder nada se atualizar a página
  useEffect(() => {
    saveCheckoutDraft(effectiveStoreId, {
      name,
      phone,
      deliveryType,
      tableNumber,
      cep,
      street,
      number,
      neighborhood,
      complement,
      city,
      stateUf,
      paymentMethod,
      cashGivenInput,
    });
  }, [
    effectiveStoreId,
    name,
    phone,
    deliveryType,
    tableNumber,
    cep,
    street,
    number,
    neighborhood,
    complement,
    city,
    stateUf,
    paymentMethod,
    cashGivenInput,
  ]);

  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

  // Match neighborhood delivery fee from store settings
  const matchedNeighborhood = useMemo(() => {
    if (deliveryType !== 'delivery' || !neighborhood.trim() || !settings.deliveryNeighborhoods?.length) {
      return null;
    }
    const cleanB = neighborhood.trim().toLowerCase();
    const cleanC = city.trim().toLowerCase();
    return (
      settings.deliveryNeighborhoods.find(
        (n) =>
          n.neighborhood.toLowerCase().trim() === cleanB &&
          (!cleanC || n.city.toLowerCase().trim() === cleanC)
      ) ||
      settings.deliveryNeighborhoods.find(
        (n) => n.neighborhood.toLowerCase().trim() === cleanB
      ) ||
      null
    );
  }, [deliveryType, neighborhood, city, settings.deliveryNeighborhoods]);

  const deliveryFee = useMemo(() => {
    if (deliveryType !== 'delivery') return 0;
    if (matchedNeighborhood) return matchedNeighborhood.fee;
    return settings.deliveryFee;
  }, [deliveryType, matchedNeighborhood, settings.deliveryFee]);

  const total = subtotal + deliveryFee;

  // Auto calculate change
  const cashGivenNumber = parseFloat(cashGivenInput.replace(',', '.')) || 0;
  const changeAmount = cashGivenNumber > 0 ? cashGivenNumber - total : 0;

  // Pix live QR Code for store's own configured Pix key
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [copiedStorePix, setCopiedStorePix] = useState(false);

  const cleanStorePixKey = useMemo(
    () => extractCleanPixKey(settings.pixKey || ''),
    [settings.pixKey]
  );

  const storePixCopiaECola = useMemo(() => {
    if (!cleanStorePixKey || total <= 0) return '';
    return generatePixPayload({
      pixKey: cleanStorePixKey,
      amount: total,
      merchantName: settings.storeName || 'CARDAPP',
      merchantCity: city || 'BRASIL',
      transactionId: `PED${Date.now().toString(36).toUpperCase().slice(-6)}`,
    });
  }, [cleanStorePixKey, total, settings.storeName, city]);

  useEffect(() => {
    let active = true;
    if (paymentMethod === 'pix' && storePixCopiaECola) {
      QRCode.toDataURL(storePixCopiaECola, {
        width: 220,
        margin: 1,
        color: { dark: '#022c22', light: '#ffffff' },
      })
        .then((url) => {
          if (active) setPixQrDataUrl(url);
        })
        .catch(() => {
          if (active) setPixQrDataUrl('');
        });
    } else {
      setPixQrDataUrl('');
    }
    return () => {
      active = false;
    };
  }, [paymentMethod, storePixCopiaECola]);

  const handleCopyStorePix = async () => {
    if (!storePixCopiaECola) return;
    try {
      await navigator.clipboard.writeText(storePixCopiaECola);
      setCopiedStorePix(true);
      setTimeout(() => setCopiedStorePix(false), 2500);
    } catch {}
  };

  // Sync if settings change
  useEffect(() => {
    if (!allowDelivery && deliveryType === 'delivery') {
      if (allowRetirada) setDeliveryType('retirada');
      else if (allowMesa) setDeliveryType('mesa');
    }
  }, [allowDelivery, allowRetirada, allowMesa, deliveryType]);

  // Busca de endereço pelo CEP via ViaCEP
  const handleSearchCep = async (cepToSearch: string) => {
    const clean = cepToSearch.replace(/\D/g, '');
    if (clean.length !== 8) {
      setAddressFeedback({
        type: 'error',
        text: 'Por favor, digite os 8 números do CEP completo.',
      });
      return;
    }

    setIsLoadingCep(true);
    setAddressFeedback(null);
    try {
      const res = await fetchAddressByCep(clean);
      if (res) {
        if (res.street) setStreet(res.street);
        if (res.neighborhood) setNeighborhood(res.neighborhood);
        if (res.city) setCity(res.city);
        if (res.state) setStateUf(res.state);
        setCep(res.cep || formatCep(clean));

        setAddressFeedback({
          type: 'success',
          text: 'Endereço encontrado pelo CEP! Agora informe o número da sua residência.',
        });

        // Foca automaticamente no campo de número
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 150);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CEP não encontrado.';
      setAddressFeedback({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    const formatted = formatCep(val);
    setCep(formatted);
    // Se digitou os 8 dígitos (9 caracteres com hífen), busca automaticamente
    if (formatted.length === 9) {
      handleSearchCep(formatted);
    }
  };

  // Busca de localização em tempo real via GPS do dispositivo
  const handleGetRealtimeLocation = () => {
    if (!('geolocation' in navigator)) {
      setAddressFeedback({
        type: 'error',
        text: 'Geolocalização não suportada neste navegador.',
      });
      return;
    }

    setIsLoadingGps(true);
    setAddressFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetchAddressByCoordinates(latitude, longitude);

          if (res.street) setStreet(res.street);
          if (res.neighborhood) setNeighborhood(res.neighborhood);
          if (res.city) setCity(res.city);
          if (res.state) setStateUf(res.state);
          if (res.cep) setCep(res.cep);
          if (res.number) setNumber(res.number);

          setAddressFeedback({
            type: 'success',
            text: '📍 Localização atual obtida com sucesso em tempo real! Confira os dados e informe o número do imóvel.',
          });

          if (!res.number) {
            setTimeout(() => {
              numberInputRef.current?.focus();
            }, 150);
          }
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Não foi possível converter a coordenada GPS em endereço.';
          setAddressFeedback({
            type: 'error',
            text: `${msg} Você também pode preencher o CEP abaixo.`,
          });
        } finally {
          setIsLoadingGps(false);
        }
      },
      (geoErr) => {
        setIsLoadingGps(false);
        let msg = 'Permissão de localização negada pelo navegador.';
        if (geoErr.code === geoErr.TIMEOUT) {
          msg = 'Tempo esgotado para obter sinal de GPS.';
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          msg = 'Sinal de localização GPS indisponível no momento.';
        }
        setAddressFeedback({
          type: 'error',
          text: `${msg} Por favor, informe seu CEP abaixo para preencher o endereço automaticamente.`,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Por favor, informe um número de telefone/WhatsApp válido.');
      return;
    }

    if (deliveryType === 'delivery') {
      if (!street.trim() || !number.trim() || !neighborhood.trim()) {
        setError('Por favor, preencha a rua, o número e o bairro para a entrega.');
        return;
      }
    } else if (deliveryType === 'mesa') {
      if (!tableNumber.trim()) {
        setError('Por favor, informe o número da mesa em que você está.');
        return;
      }
    }

    if (paymentMethod === 'dinheiro' && cashGivenNumber > 0 && cashGivenNumber < total) {
      setError(`O valor entregue em dinheiro (${formatCurrency(cashGivenNumber)}) não pode ser menor que o total da conta (${formatCurrency(total)}).`);
      return;
    }

    const customerData: OrderCustomer = {
      name: name.trim(),
      phone: phone.trim(),
      deliveryType,
      tableNumber: deliveryType === 'mesa' ? tableNumber.trim() : undefined,
      address:
        deliveryType === 'delivery'
          ? {
              cep: cep.trim() || undefined,
              street: street.trim(),
              number: number.trim(),
              neighborhood: neighborhood.trim(),
              complement: complement.trim(),
              city: city.trim(),
              state: stateUf.trim() || undefined,
            }
          : undefined,
      paymentMethod,
      cashGiven: paymentMethod === 'dinheiro' && cashGivenNumber > 0 ? cashGivenNumber : undefined,
      changeToReturn: paymentMethod === 'dinheiro' && changeAmount > 0 ? changeAmount : 0,
    };

    clearCheckoutCashDraft(effectiveStoreId);
    onSubmitOrder(customerData);
  };

  const hasName = Boolean(name.trim());
  const hasPhone = Boolean(phone.replace(/\D/g, '').length >= 8);
  const hasDeliveryLocation =
    deliveryType === 'retirada'
      ? true
      : deliveryType === 'mesa'
      ? Boolean(tableNumber.trim())
      : Boolean(street.trim() && number.trim() && neighborhood.trim());
  const hasPayment = Boolean(paymentMethod);

  const completedCount = [hasName, hasPhone, hasDeliveryLocation, hasPayment].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
          Etapa 03 de 04
        </span>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          Identificação & Entrega
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Informe seus dados para a entrega e selecione a forma de pagamento autorizada pela loja.
        </p>
      </div>

      {/* BARRA DE PROGRESSO DE PREENCHIMENTO DO CHECKOUT */}
      <div className="mb-6 p-4 rounded-3xl bg-white border border-amber-300 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className={`w-4 h-4 ${progressPercent === 100 ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>Progresso do Preenchimento</span>
          </span>
          <span className="font-mono text-slate-950 bg-amber-100 px-2 py-0.5 rounded-full">
            {progressPercent}% Completo ({completedCount}/4)
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              progressPercent === 100 ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
          <span className={`px-2 py-0.5 rounded-lg flex items-center gap-1 ${hasName ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
            {hasName ? '✓' : '•'} Nome
          </span>
          <span className={`px-2 py-0.5 rounded-lg flex items-center gap-1 ${hasPhone ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
            {hasPhone ? '✓' : '•'} WhatsApp
          </span>
          <span className={`px-2 py-0.5 rounded-lg flex items-center gap-1 ${hasDeliveryLocation ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
            {hasDeliveryLocation ? '✓' : '•'} {deliveryType === 'delivery' ? 'Endereço/Entrega' : deliveryType === 'mesa' ? 'Mesa' : 'Retirada'}
          </span>
          <span className={`px-2 py-0.5 rounded-lg flex items-center gap-1 ${hasPayment ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
            {hasPayment ? '✓' : '•'} Pagamento
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Contact */}
        <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-extrabold">
              1
            </span>
            Seus Dados de Contato
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Lucas Ferreira"
                className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp / Telefone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (55)999999999"
                className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Você receberá o rastreio e atualizações aqui.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Type (Configured by CEO) */}
        <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-extrabold">
              2
            </span>
            Como deseja receber seu pedido?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {allowDelivery && (
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <Bike className={`w-6 h-6 mb-2 ${deliveryType === 'delivery' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div>
                  <span className="block font-bold text-sm text-slate-900">Entrega (Delivery)</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Taxa: {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}
                    {matchedNeighborhood && ` (${matchedNeighborhood.neighborhood})`}
                  </span>
                </div>
              </button>
            )}

            {allowRetirada && (
              <button
                type="button"
                onClick={() => setDeliveryType('retirada')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'retirada'
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <Store className={`w-6 h-6 mb-2 ${deliveryType === 'retirada' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div>
                  <span className="block font-bold text-sm text-slate-900">Somente Retirada</span>
                  <span className="text-xs text-slate-500">Retirar no Balcão (Grátis)</span>
                </div>
              </button>
            )}

            {allowMesa && (
              <button
                type="button"
                onClick={() => setDeliveryType('mesa')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'mesa'
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <UtensilsCrossed className={`w-6 h-6 mb-2 ${deliveryType === 'mesa' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div>
                  <span className="block font-bold text-sm text-slate-900">Consumir no local</span>
                  <span className="text-xs text-slate-500">Servir na Mesa</span>
                </div>
              </button>
            )}
          </div>

          {/* Conditional Address Fields */}
          {deliveryType === 'delivery' && (
            <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
              {/* Top Banner: Localização em tempo real & CEP */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-950">Localização do Cliente</h4>
                    <p className="text-[11px] text-slate-600">Busque via GPS em tempo real ou digite seu CEP</p>
                  </div>
                </div>

                {/* Botão de Localização em Tempo Real (GPS) */}
                <button
                  type="button"
                  onClick={handleGetRealtimeLocation}
                  disabled={isLoadingGps}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 shrink-0"
                  title="Localizar meu endereço em tempo real através do GPS"
                >
                  {isLoadingGps ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Buscando GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                      <span>📍 Localização em Tempo Real</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feedback visual de sucesso ou erro na busca de localização */}
              {addressFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                    addressFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {addressFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{addressFeedback.text}</span>
                </div>
              )}

              {/* Campo do CEP da rua com Busca Automática */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CEP da Rua *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onBlur={() => {
                        if (cep.replace(/\D/g, '').length === 8) {
                          handleSearchCep(cep);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full text-sm p-3 pr-10 rounded-xl border border-slate-300 focus:border-amber-500 font-mono outline-none bg-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchCep(cep)}
                      disabled={isLoadingCep || cep.replace(/\D/g, '').length < 8}
                      className="absolute right-1.5 p-1.5 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors disabled:opacity-30 cursor-pointer"
                      title="Buscar endereço por este CEP"
                    >
                      {isLoadingCep ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rua / Avenida *
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ex: Rua Bela Cintra (preenche automático com o CEP)"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Número e Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número *
                  </label>
                  <input
                    ref={numberInputRef}
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 840"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Consolação (preenche automático com o CEP)"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white font-medium"
                  />
                  {matchedNeighborhood ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Taxa calculada para {matchedNeighborhood.neighborhood}:{' '}
                        <strong>{matchedNeighborhood.fee > 0 ? formatCurrency(matchedNeighborhood.fee) : 'Grátis'}</strong>
                        {matchedNeighborhood.estimatedTime && ` • ${matchedNeighborhood.estimatedTime}`}
                      </span>
                    </div>
                  ) : settings.deliveryNeighborhoods && settings.deliveryNeighborhoods.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">Bairros cadastrados:</span>
                      {settings.deliveryNeighborhoods.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNeighborhood(n.neighborhood);
                            if (n.city) setCity(n.city);
                            if (n.state) setStateUf(n.state);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 transition-colors cursor-pointer"
                        >
                          {n.neighborhood} ({n.fee > 0 ? formatCurrency(n.fee) : 'Grátis'})
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Complemento, Cidade e UF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Complemento / Apto
                  </label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Ex: Apto 42B / Bloco 2"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value)}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white uppercase font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {deliveryType === 'mesa' && (
            <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Selecione sua Mesa *
              </label>
              {settings.tables && settings.tables.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {settings.tables.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTableNumber(t)}
                      className={`p-2 text-xs font-bold rounded-xl border ${
                        tableNumber === t
                          ? 'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-500'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ex: Mesa 04"
                  className="w-full sm:w-48 text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Section 3: Payment Method (Configured by CEO) */}
        <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-extrabold">
              3
            </span>
            Forma de Pagamento
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {allowPix && (
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`relative p-3.5 rounded-2xl border-2 text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300 font-black shadow-md'
                    : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Instantâneo
                </span>
                <QrCode className="w-6 h-6 text-emerald-700 stroke-[2.4]" />
                <span className="text-xs font-black text-emerald-950">Pix</span>
              </button>
            )}

            {allowCreditCard && (
              <button
                type="button"
                onClick={() => setPaymentMethod('cartao_credito')}
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'cartao_credito'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 font-bold'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <CreditCard className="w-6 h-6 text-amber-600" />
                <span className="text-xs text-slate-900">Crédito</span>
              </button>
            )}

            {allowDebitCard && (
              <button
                type="button"
                onClick={() => setPaymentMethod('cartao_debito')}
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'cartao_debito'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 font-bold'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <CreditCard className="w-6 h-6 text-slate-700" />
                <span className="text-xs text-slate-900">Débito</span>
              </button>
            )}

            {allowCash && (
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'dinheiro'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 font-bold'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <Banknote className="w-6 h-6 text-emerald-600" />
                <span className="text-xs text-slate-900">Dinheiro</span>
              </button>
            )}
          </div>

          {/* Card em Destaque para Pagamento via Pix */}
          {paymentMethod === 'pix' && (
            <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-5 space-y-4 shadow-md animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-5 h-5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      Pagamento Rápido e Seguro • br.gov.bcb.pix
                    </span>
                    <h3 className="text-sm font-black text-slate-950">
                      Pix Selecionado • Confirmação Ágil
                    </h3>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 text-emerald-300 font-mono font-black text-sm shrink-0 self-start sm:self-auto">
                  {formatCurrency(total)}
                </div>
              </div>

              {storePixCopiaECola ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {pixQrDataUrl && (
                    <div className="p-2.5 rounded-2xl bg-white border-2 border-emerald-400 shadow-sm shrink-0">
                      <img
                        src={pixQrDataUrl}
                        alt="QR Code Pix do Pedido"
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2.5 text-left">
                    <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                      Você já pode pagar agora pelo QR Code ou copiando o código Pix abaixo, e em seguida clicar em <strong>Confirmar Pedido</strong>.
                    </p>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-300">
                      <code className="text-[11px] font-mono font-bold text-slate-800 block truncate select-all">
                        {storePixCopiaECola}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyStorePix}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                        copiedStorePix
                          ? 'bg-slate-950 text-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {copiedStorePix ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Código Pix Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Pix Copia e Cola</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-xs text-emerald-950 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Ao confirmar o pedido, você receberá as instruções e a chave Pix da loja diretamente no resumo e no WhatsApp para agilizar o pagamento de{' '}
                    <strong>{formatCurrency(total)}</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AUTOMATIC CHANGE CALCULATION FOR CASH (EXACT REQUIREMENT) */}
          {paymentMethod === 'dinheiro' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-3 animate-in fade-in duration-200">
              <div>
                <label className="block font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  Valor que você entregará em dinheiro (R$):
                </label>
                <input
                  type="text"
                  value={cashGivenInput}
                  onChange={(e) => setCashGivenInput(e.target.value)}
                  placeholder={`Ex: ${(total + 20).toFixed(2)} (ou deixe em branco se não precisar de troco)`}
                  className="w-full sm:w-64 text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white font-mono"
                />
              </div>

              {cashGivenNumber > 0 && (
                <div className="pt-2 border-t border-amber-200">
                  {changeAmount > 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950">
                      <span className="text-[11px] font-bold uppercase tracking-wide block">
                        Troco calculado que a loja deve levar:
                      </span>
                      <span className="text-xl font-black font-mono">
                        {formatCurrency(changeAmount)}
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        (Você pagará {formatCurrency(cashGivenNumber)} para uma conta de {formatCurrency(total)})
                      </p>
                    </div>
                  ) : changeAmount === 0 ? (
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold">
                      Valor exato — Não necessita de troco.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-red-100 text-red-800 font-bold">
                      O valor digitado ({formatCurrency(cashGivenNumber)}) é menor que o total do pedido ({formatCurrency(total)}).
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Total Summary */}
        <div className="bg-amber-400/20 border border-amber-300 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
              Total Final do Pedido
            </span>
            <span className="text-2xl font-black text-slate-950 font-mono tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {items.length} {items.length === 1 ? 'item' : 'itens'} no pedido
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onBackToCart}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Sacola</span>
          </button>

          <button
            type="submit"
            className="w-full sm:flex-1 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-base shadow-lg hover:shadow-amber-400/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-5 h-5 fill-slate-950 stroke-[2.2]" />
            <span>Confirmar Pedido & Enviar no WhatsApp</span>
          </button>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-wider">
          Desenvolvido por SF TECNOLOGIA
        </p>
      </form>
    </div>
  );
};
