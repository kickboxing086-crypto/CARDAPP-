import React from 'react';
import { Utensils, ShoppingBag, MapPin, Clock3, Check } from 'lucide-react';

interface StepTrackerProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
  cartCount: number;
}

export const StepTracker: React.FC<StepTrackerProps> = ({
  currentStep,
  onStepClick,
  cartCount,
}) => {
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
      sublabel: `${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`,
      icon: ShoppingBag,
    },
    {
      num: 3 as const,
      label: 'Entrega & Pagamento',
      sublabel: 'Dados e endereço',
      icon: MapPin,
    },
    {
      num: 4 as const,
      label: 'Acompanhar Pedido',
      sublabel: 'Status em tempo real',
      icon: Clock3,
    },
  ];

  return (
    <div className="w-full bg-white border-b border-amber-200/80 sticky top-16 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {/* Mobile View: Compact Progress Bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-[11px]">
                {currentStep}
              </span>
              Etapa {currentStep} de 4: {steps[currentStep - 1].label}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {steps[currentStep - 1].sublabel}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
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
            const Icon = step.icon;

            const isClickable =
              onStepClick && (isCompleted || (step.num === 1 && currentStep <= 3) || (step.num === 2 && cartCount > 0));

            return (
              <button
                key={step.num}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick && onStepClick(step.num)}
                className={`relative flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all text-left bg-white z-10 ${
                  isClickable ? 'cursor-pointer hover:bg-amber-50/70' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-xs ${
                    isCompleted
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-200 font-extrabold shadow-sm'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
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
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
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
