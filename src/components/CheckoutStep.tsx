import React, { useState, useEffect, useRef } from 'react';
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
import { CartItem, StoreSettings, OrderCustomer } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  fetchAddressByCep,
  fetchAddressByCoordinates,
  formatCep,
} from '../utils/addressService';

interface CheckoutStepProps {
  items: CartItem[];
  settings: StoreSettings;
  onBackToCart: () => void;
  onSubmitOrder: (customerData: OrderCustomer) => void;
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  items,
  settings,
  onBackToCart,
  onSubmitOrder,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Service modes available from settings
  const { allowDelivery, allowRetirada, allowMesa } = settings.serviceModes;
  const initialMode = allowDelivery ? 'delivery' : allowRetirada ? 'retirada' : 'mesa';
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retirada' | 'mesa'>(initialMode);
  const [tableNumber, setTableNumber] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [stateUf, setStateUf] = useState('');

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>(initialPayment);
  
  // Cash & Change calculation
  const [cashGivenInput, setCashGivenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const deliveryFee = deliveryType === 'delivery' ? settings.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  // Auto calculate change
  const cashGivenNumber = parseFloat(cashGivenInput.replace(',', '.')) || 0;
  const changeAmount = cashGivenNumber > 0 ? cashGivenNumber - total : 0;

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

    onSubmitOrder(customerData);
  };

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
                placeholder="Ex: (11) 98765-4321"
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
                  <span className="text-xs text-slate-500">
                    Taxa: {formatCurrency(settings.deliveryFee)}
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
                  <span className="block font-bold text-sm text-slate-900">Consumo no Local</span>
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
                      type="text"
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
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none bg-white"
                  />
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Número da Mesa *
              </label>
              <input
                type="text"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ex: Mesa 04"
                className="w-full sm:w-48 text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
              />
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
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 font-bold'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <QrCode className="w-6 h-6 text-amber-600" />
                <span className="text-xs text-slate-900">Pix</span>
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

          {/* Pix instruction box (smooth & clean without pixKey input) */}
          {paymentMethod === 'pix' && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <QrCode className="w-5 h-5 text-amber-700 shrink-0" />
              <span>
                A chave Pix da loja será informada diretamente no WhatsApp junto com o resumo do seu pedido.
              </span>
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
