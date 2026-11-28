import React from 'react';
import { Utensils, ShoppingBag, MapPin, Clock3, Check, Lock } from 'lucide-react';

interface StepTrackerProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
  cartCount: number;
  hasActiveOrder?: boolean;
}

export const StepTracker: React.FC<StepTrackerProps> = ({
  currentStep,
  onStepClick,
  cartCount,
  hasActiveOrder = false,
}) => {
  const isStepAccessible = (stepNum: 1 | 2 | 3 | 4): boolean => {
    if (!onStepClick) return false;
    // Etapa 1: Sempre acessível para ver produtos
    if (stepNum === 1) return true;
    // Etapa 2: Apenas se houver produtos no carrinho
    if (stepNum === 2) return cartCount > 0;
    // Etapa 3: Apenas se houver itens no carrinho E o cliente estiver na etapa 2 ou 3
    if (stepNum === 3) return cartCount > 0 && currentStep >= 2;
    // Etapa 4: Exclusivamente quando houver pedido ativo realizado
    if (stepNum === 4) return hasActiveOrder;
    return false;
  };

  const steps = [
    {
      num: 1 as const,
      label: 'Cardápio',
      sublabel: 'Escolha os pratos',
      icon: Utensils,
    },
    {
      num: 2 as const,
      label: 'Sacola',
      sublabel: cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Vazia',
      icon: ShoppingBag,
    },
    {
      num: 3 as const,
      label: 'Entrega & Pagamento',
      sublabel: cartCount > 0 ? 'Dados e endereço' : 'Adicione itens',
      icon: MapPin,
    },
    {
      num: 4 as const,
      label: 'Acompanhar Pedido',
      sublabel: hasActiveOrder ? 'Status em tempo real' : 'Após enviar pedido',
      icon: Clock3,
    },
  ];

  return (
    <div className="w-full bg-white border-b border-amber-200/80 sticky top-16 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {/* Mobile View: Interactive Steps + Progress Bar */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
            {steps.map((st) => {
              const isComp = st.num < currentStep;
              const isCurr = st.num === currentStep;
              const isClick = isStepAccessible(st.num);
              return (
                <button
                  key={st.num}
                  type="button"
                  disabled={!isClick}
                  onClick={() => isClick && onStepClick && onStepClick(st.num)}
                  title={!isClick ? 'Preencha a etapa anterior para desbloquear' : undefined}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                    isCurr
                      ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                      : isComp
                      ? 'bg-amber-100 text-amber-950'
                      : isClick
                      ? 'bg-slate-100 text-slate-700 hover:bg-amber-50 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-950/15 flex items-center justify-center text-[10px]">
                    {!isClick && st.num > currentStep ? (
                      <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    ) : (
                      st.num
                    )}
                  </span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-full flex-1 transition-all duration-300 ${
                  stepNum <= currentStep ? 'bg-amber-400' : 'bg-slate-200'
                } ${stepNum > 1 ? 'border-l border-white' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop View: Full 4-Step Tracker */}
        <div className="hidden md:flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-amber-400 transition-all duration-300 -z-0"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {steps.map((step) => {
            const isCompleted = step.num < currentStep;
            const isCurrent = step.num === currentStep;
            const isClickable = isStepAccessible(step.num);
            const Icon = step.icon;

            return (
              <button
                key={step.num}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick && onStepClick(step.num)}
                title={!isClickable ? 'Complete os requisitos da etapa anterior para desbloquear' : undefined}
                className={`relative flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all text-left bg-white z-10 ${
                  isClickable
                    ? 'cursor-pointer hover:bg-amber-50/70'
                    : 'cursor-not-allowed opacity-50 select-none'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-xs ${
                    isCompleted
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-200 font-extrabold shadow-sm'
                      : isClickable
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : !isClickable && step.num > currentStep ? (
                    <Lock className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isCurrent
                          ? 'text-amber-800'
                          : isCompleted
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      Etapa 0{step.num}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold leading-tight ${
                      isCurrent
                        ? 'text-slate-950 font-extrabold'
                        : isCompleted
                        ? 'text-slate-800'
                        : isClickable
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {step.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
