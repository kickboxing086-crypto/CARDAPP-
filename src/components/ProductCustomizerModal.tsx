import React, { useState } from 'react';
import { X, Plus, Minus, Check, MessageSquare, Tag } from 'lucide-react';
import { Product, SelectedComplement, ProductComplement } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ForkKnifePlaceholder } from './ForkKnifeIcon';

interface ProductCustomizerModalProps {
  product: Product | null;
  initialQuantity?: number;
  initialNotes?: string;
  initialComplements?: SelectedComplement[];
  onClose: () => void;
  onConfirm: (
    product: Product,
    quantity: number,
    notes: string,
    selectedComplements: SelectedComplement[],
    appliedPromotion?: { promoQuantity: number; promoPrice: number; savings: number },
    totalPrice?: number
  ) => void;
}

export const ProductCustomizerModal: React.FC<ProductCustomizerModalProps> = ({
  product,
  initialQuantity = 1,
  initialNotes = '',
  initialComplements = [],
  onClose,
  onConfirm,
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState(initialQuantity > 0 ? initialQuantity : 1);
  const [notes, setNotes] = useState(initialNotes);
  const [selectedComplements, setSelectedComplements] = useState<SelectedComplement[]>(initialComplements);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Toggle complement selection
  const handleToggleComplement = (comp: ProductComplement) => {
    setSelectedComplements((prev) => {
      const exists = prev.some((c) => c.id === comp.id);
      if (exists) {
        return prev.filter((c) => c.id !== comp.id);
      }
      return [...prev, { id: comp.id, name: comp.name, price: comp.price }];
    });
  };

  // Promotion calculation
  const promo = product.promotion;
  let basePrice = product.price * quantity;
  let savings = 0;
  let appliedPromo: { promoQuantity: number; promoPrice: number; savings: number } | undefined = undefined;

  if (promo && promo.enabled && promo.promoQuantity > 0 && quantity >= promo.promoQuantity) {
    const bundles = Math.floor(quantity / promo.promoQuantity);
    const remainder = quantity % promo.promoQuantity;
    const bundledPrice = bundles * promo.promoPrice + remainder * product.price;
    savings = basePrice - bundledPrice;
    if (savings > 0) {
      basePrice = bundledPrice;
      appliedPromo = {
        promoQuantity: promo.promoQuantity,
        promoPrice: promo.promoPrice,
        savings,
      };
    }
  }

  // Complements sum (per unit or total)
  const complementsUnitTotal = selectedComplements.reduce((acc, c) => acc + c.price, 0);
  const complementsTotal = complementsUnitTotal * quantity;
  const grandTotal = basePrice + complementsTotal;

  const handleConfirm = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onConfirm(product, quantity, notes, selectedComplements, appliedPromo, grandTotal);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-amber-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Image or Fork & Knife */}
        <div className="relative aspect-16/9 w-full bg-amber-50 overflow-hidden shrink-0 border-b border-amber-100">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ForkKnifePlaceholder productName={product.name} />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-slate-800 hover:bg-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Promo Tag */}
          {promo && promo.enabled && (
            <div className="absolute bottom-3 left-3 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-xl shadow-md flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Promoção: {promo.promoQuantity} por {formatCurrency(promo.promoPrice)}</span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight mb-1">
              {product.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Quantity Selector & Price Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold text-amber-900 tracking-wider block">
                Valor Base
              </span>
              <span className="text-lg font-extrabold text-slate-950 font-mono tabular-nums">
                {formatCurrency(product.price)}
              </span>
              {promo && promo.enabled && (
                <span className="text-[11px] font-bold text-amber-700 block mt-0.5">
                  Dica: Peça {promo.promoQuantity} por apenas {formatCurrency(promo.promoPrice)}!
                </span>
              )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2.5 bg-white p-1 rounded-xl border border-amber-300 shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center font-bold transition-all cursor-pointer"
                aria-label="Diminuir"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="min-w-7 text-center font-black text-sm text-slate-950 font-mono tabular-nums">
                {quantity}x
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center font-bold transition-all cursor-pointer"
                aria-label="Aumentar"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Complements (Complementos do Produto) */}
          {product.complements && product.complements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Adicionar Complementos (Opcional)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Selecione quantos desejar
                </span>
              </div>

              <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                {product.complements.map((comp) => {
                  const isChecked = selectedComplements.some((c) => c.id === comp.id);
                  return (
                    <label
                      key={comp.id}
                      onClick={() => handleToggleComplement(comp)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-amber-100/90 border-amber-400 text-amber-950 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent label click
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                        />
                        <span>{comp.name}</span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {comp.price > 0 ? `+ ${formatCurrency(comp.price)}` : 'Grátis'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kitchen Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              Observações Especiais
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, caprichar no recheio..."
              rows={2}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Savings Callout if Promotion Applied */}
          {appliedPromo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
              <span>Promoção aplicada! Você economizou nesta escolha:</span>
              <span className="font-mono">{formatCurrency(appliedPromo.savings)}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-amber-200 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Total ({quantity}x)
            </span>
            <span className="text-xl font-black text-slate-950 font-mono tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 ${
              isSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Adicionado com Sucesso!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar à Sacola • {formatCurrency(grandTotal)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
