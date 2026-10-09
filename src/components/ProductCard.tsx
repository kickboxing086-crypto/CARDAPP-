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
      className={`group relative bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden text-left cursor-pointer ${
        product.isAvailable
          ? 'border-amber-200/70 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1'
          : 'border-slate-200 opacity-60'
      }`}
    >
      {/* Product Image Slot or Fork & Knife Placeholder */}
      <div className="relative aspect-4/3 w-full bg-amber-50/60 overflow-hidden">
        {!imageError && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ForkKnifePlaceholder productName={product.name} />
        )}

        {/* Promotion Badge if enabled */}
        {product.promotion?.enabled && (
          <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
            <Tag className="w-3 h-3 stroke-[2.5]" />
            <span>{product.promotion.promoQuantity} por {formatCurrency(product.promotion.promoPrice)}</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-md">
              Esgotado no Momento
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1 mb-1">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
            {product.description}
          </p>

          {/* Complements indicator */}
          {product.complements && product.complements.length > 0 && (
            <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mb-2">
              Opções de complementos disponíveis
            </span>
          )}
        </div>

        {/* Price & Quantity Controls */}
        <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-slate-950 font-mono tabular-nums">
                {formatCurrency(product.price)}
              </span>
              {product.promotion?.enabled && (
                <span className="text-[11px] text-amber-800 font-bold">
                  (ou {product.promotion.promoQuantity}x {formatCurrency(product.promotion.promoPrice)})
                </span>
              )}
            </div>
          </div>

          {/* Interactive "+" and Quantity Control */}
          {product.isAvailable && (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              {quantityInCart === 0 ? (
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all duration-200 cursor-pointer shadow-xs ${
                    justAdded
                      ? 'bg-emerald-500 text-white scale-105'
                      : 'bg-amber-400 hover:bg-amber-500 text-slate-950 active:scale-95'
                  }`}
                  aria-label={`Adicionar ${product.name} com um símbolo de +`}
                  title="Adicionar ao pedido"
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Adicionado</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Adicionar</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-7 h-7 rounded-lg bg-white text-slate-900 hover:bg-amber-100 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <span className="min-w-6 text-center font-extrabold text-xs text-slate-950 font-mono tabular-nums">
                    {quantityInCart}x
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500 flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90"
                    aria-label="Aumentar quantidade (+)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
