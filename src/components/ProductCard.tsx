import React, { useState } from 'react';
import { Plus, Minus, Check, Tag } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ForkKnifePlaceholder } from './ForkKnifeIcon';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product, quantityToAdd: number) => void;
  onUpdateQuantity: (product: Product, newQuantity: number) => void;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onOpenDetails,
}) => {
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable) return;
    // A opção de complementos aparece quando o cliente clica para selecionar o pedido
    onOpenDetails(product);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantityInCart > 0) {
      onUpdateQuantity(product, quantityInCart - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.complements && product.complements.length > 0) {
      onOpenDetails(product);
      return;
    }
    onUpdateQuantity(product, quantityInCart + 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 flex flex-row items-center justify-between p-3.5 sm:p-4 text-left cursor-pointer gap-3 sm:gap-4 shadow-2xs hover:shadow-md hover:border-amber-400 ${
        product.isAvailable
          ? 'border-amber-200/80 bg-white hover:bg-amber-50/20'
          : 'border-slate-200 opacity-60 bg-slate-50/50'
      }`}
    >
      {/* Product Details (Left Side) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Top badges (Promotion / Out of Stock) */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {product.promotion?.enabled && (
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-2xs inline-flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>{product.promotion.promoQuantity} por {formatCurrency(product.promotion.promoPrice)}</span>
              </span>
            )}
            {!product.isAvailable && (
              <span className="bg-red-100 text-red-800 font-bold text-[10px] uppercase px-2 py-0.5 rounded-md">
                Esgotado
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-950 group-hover:text-amber-800 transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
            {product.description}
          </p>

          {/* Complements indicator */}
          {product.complements && product.complements.length > 0 && (
            <span className="inline-block text-[10px] sm:text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 mt-1.5">
              Opções de complementos disponíveis
            </span>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="pt-2 flex items-center justify-between gap-2 mt-2 border-t border-amber-100/60">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-950 font-mono tabular-nums">
              {formatCurrency(product.price)}
            </span>
            {product.promotion?.enabled && (
              <span className="text-[10px] sm:text-[11px] text-amber-800 font-bold">
                (ou {product.promotion.promoQuantity}x {formatCurrency(product.promotion.promoPrice)})
              </span>
            )}
          </div>

          {/* Interactive "+" and Quantity Control */}
          {product.isAvailable && (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              {quantityInCart === 0 ? (
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className={`flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-black text-xs transition-all duration-200 cursor-pointer shadow-xs ${
                    justAdded
                      ? 'bg-emerald-500 text-white scale-105'
                      : 'bg-amber-400 hover:bg-amber-500 text-slate-950 active:scale-95'
                  }`}
                  aria-label={`Adicionar ${product.name} com um símbolo de +`}
                  title="Adicionar ao pedido"
                >
                  {justAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Adicionado</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Adicionar</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-slate-900 hover:bg-amber-100 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                  <span className="min-w-5 sm:min-w-6 text-center font-extrabold text-xs text-slate-950 font-mono tabular-nums">
                    {quantityInCart}x
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500 flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90"
                    aria-label="Aumentar quantidade (+)"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Image Slot (Right Side) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl bg-amber-50/70 overflow-hidden shrink-0 border border-amber-200/80 shadow-2xs">
        {!imageError && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ForkKnifePlaceholder productName={product.name} />
        )}

        {/* Out of Stock Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-[10px] font-black uppercase text-white bg-red-600 px-2 py-0.5 rounded shadow">
              Esgotado
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
