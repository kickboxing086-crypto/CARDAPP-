import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface FloatingCartBarProps {
  totalItems: number;
  subtotal: number;
  onOpenCart: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  totalItems,
  subtotal,
  onOpenCart,
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-950 text-white rounded-2xl p-3 shadow-2xl border border-amber-400 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black relative">
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black flex items-center justify-center border border-amber-400">
              {totalItems}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-amber-400 font-bold block uppercase tracking-wide">
              {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <span className="text-base font-black font-mono tabular-nums text-white">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCart}
          className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span>Avançar para Etapa 2</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
