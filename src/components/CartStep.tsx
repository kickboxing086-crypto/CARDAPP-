import React from 'react';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight, ShoppingBag, MessageSquare, Tag } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ForkKnifeIcon } from './ForkKnifeIcon';

interface CartStepProps {
  items: CartItem[];
  settings: StoreSettings;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onBackToMenu: () => void;
  onProceedToCheckout: () => void;
}

export const CartStep: React.FC<CartStepProps> = ({
  items,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onBackToMenu,
  onProceedToCheckout,
}) => {
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const deliveryFee = settings.deliveryFee;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-amber-100 text-amber-800 rounded-3xl mx-auto flex items-center justify-center mb-5 shadow-inner">
          <ShoppingBag className="w-10 h-10 stroke-[1.8]" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Sua sacola está vazia</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
          Você ainda não escolheu nenhum item. Navegue pelo nosso cardápio e adicione os pratos que desejar com o botão "+".
        </p>
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Ver Cardápio Completo</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
            Etapa 02 de 04
          </span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Revisão da sua Sacola
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar mais itens</span>
        </button>
      </div>

      {/* Itemized List */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden mb-6 divide-y divide-amber-100">
        {items.map((item) => (
          <div key={item.product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Left: Thumbnail & Details */}
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 overflow-hidden shrink-0 border border-amber-100 flex items-center justify-center">
                {item.product.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ForkKnifeIcon className="w-8 h-8 text-amber-500 stroke-[2]" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-extrabold text-slate-950 text-sm sm:text-base leading-snug">
                  {item.product.name}
                </h3>

                <span className="text-xs font-mono tabular-nums text-slate-500 block mb-1">
                  {formatCurrency(item.product.price)} unitário
                </span>

                {/* Complements Selected */}
                {item.selectedComplements && item.selectedComplements.length > 0 && (
                  <div className="text-xs text-slate-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 my-1 space-y-0.5">
                    <span className="font-bold text-amber-900 block text-[11px] uppercase">
                      Complementos:
                    </span>
                    {item.selectedComplements.map((c, i) => (
                      <span key={i} className="inline-block mr-2 text-[11px]">
                        • {c.name} {c.price > 0 ? `(+${formatCurrency(c.price)})` : '(Grátis)'}
                      </span>
                    ))}
                  </div>
                )}

                {/* Promotion Applied Callout */}
                {item.appliedPromotion && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-300 mt-1">
                    <Tag className="w-3 h-3 text-amber-700" />
                    <span>Promoção Ativa: {item.appliedPromotion.promoQuantity} un por {formatCurrency(item.appliedPromotion.promoPrice)}</span>
                  </div>
                )}

                {/* Kitchen Notes */}
                {item.notes && (
                  <div className="flex items-center gap-1.5 text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 mt-1 max-w-md">
                    <MessageSquare className="w-3 h-3 shrink-0 text-slate-400" />
                    <span className="truncate italic">Obs: {item.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quantity Stepper & Price */}
            <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-white text-slate-900 hover:bg-amber-100 flex items-center justify-center font-bold transition-colors cursor-pointer"
                  aria-label="Diminuir"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-8 text-center font-black text-sm text-slate-950 font-mono tabular-nums">
                  {item.quantity}x
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500 flex items-center justify-center font-bold transition-all cursor-pointer active:scale-95"
                  aria-label="Aumentar"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-right min-w-20">
                <span className="font-mono tabular-nums font-extrabold text-base text-slate-950">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemoveItem(item.product.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                title="Remover item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 mb-6">
        <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-4">
          Resumo dos Valores
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal dos itens</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Taxa estimada de entrega</span>
            <span className="font-mono tabular-nums font-semibold">
              {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}
            </span>
          </div>

          <div className="pt-3 border-t border-amber-200 flex justify-between items-baseline">
            <span className="font-black text-base text-slate-950">Total Previsto</span>
            <span className="font-mono tabular-nums text-2xl font-black text-slate-950">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onBackToMenu}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Cardápio</span>
        </button>

        <button
          type="button"
          onClick={onProceedToCheckout}
          className="w-full sm:flex-1 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Ir para Entrega & Pagamento</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
