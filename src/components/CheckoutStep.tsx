import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CartItem, StoreSettings, OrderCustomer } from '../types';
import { formatCurrency } from '../utils/formatters';

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
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('São Paulo');

  // Payment methods available from settings
  const { allowPix, allowCreditCard, allowDebitCard, allowCash } = settings.paymentMethods;
  const initialPayment = allowPix ? 'pix' : allowCreditCard ? 'cartao_credito' : allowDebitCard ? 'cartao_debito' : 'dinheiro';
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>(initialPayment);
  
  // Cash & Change calculation
  const [cashGivenInput, setCashGivenInput] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
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

  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
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
              street: street.trim(),
              number: number.trim(),
              neighborhood: neighborhood.trim(),
              complement: complement.trim(),
              city: city.trim(),
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rua / Avenida *
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ex: Rua Bela Cintra"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 840"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Consolação"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Complemento / Apto
                  </label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Ex: Apto 42B"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
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

          {/* Pix instruction box */}
          {paymentMethod === 'pix' && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-slate-700 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-950">Chave Pix da Loja:</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar Chave'}</span>
                </button>
              </div>
              <div className="font-mono bg-white p-2.5 rounded-xl border border-amber-200 text-slate-800 break-all select-all font-semibold">
                {settings.pixKey}
              </div>
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
