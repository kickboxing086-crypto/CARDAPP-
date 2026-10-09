import React, { useEffect, useState } from 'react';
import { ForkKnifeIcon } from './ForkKnifeIcon';

interface WelcomeSplashProps {
  storeName: string;
  logoBase64?: string;
  onFinish: () => void;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({
  storeName,
  logoBase64,
  onFinish,
}) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const finishTimer = setTimeout(() => {
        onFinish();
      }, 500);
      return () => clearTimeout(finishTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-slate-950 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Yellow Glow Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
      <div className="absolute w-96 h-96 rounded-full bg-amber-400/20 blur-3xl -z-0 pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Fork & Knife Icon Box in Yellow & White */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl ring-8 ring-amber-200/80 animate-bounce">
            {logoBase64 ? (
              <img
                src={logoBase64}
                alt={storeName}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <ForkKnifeIcon className="w-12 h-12 text-slate-950 stroke-[2.4]" />
            )}
          </div>
        </div>

        {/* Store Name & Welcome Text */}
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Cardápio Digital Oficial
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 font-display">
            {storeName}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Carregando pratos, complementos e atendimento em tempo real...
          </p>
        </div>

        {/* Loading Yellow Spinner Bar */}
        <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-pulse w-full" />
        </div>

        <button
          type="button"
          onClick={() => {
            setFading(true);
            setTimeout(onFinish, 200);
          }}
          className="mt-5 text-[11px] font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
        >
          Entrar no Cardápio
        </button>

        <div className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Desenvolvido por SF TECNOLOGIA
        </div>
      </div>
    </div>
  );
};
