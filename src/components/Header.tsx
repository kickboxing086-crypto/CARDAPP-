import React from 'react';
import { ShoppingBag, Menu, Info, ArrowLeft, Lock, UserCheck } from 'lucide-react';
import { StoreSettings, UserAccount } from '../types';
import { ForkKnifeIcon } from './ForkKnifeIcon';

interface HeaderProps {
  settings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenCeoMenu?: () => void;
  onOpenStoreInfo: () => void;
  onViewMenuClick: () => void;
  activeOrderCount?: number;
  onBackToLanding?: () => void;
  currentUser?: UserAccount | null;
  onOpenLoginModal?: () => void;
  showCeoControls?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  onOpenCart,
  onOpenCeoMenu,
  onOpenStoreInfo,
  onViewMenuClick,
  activeOrderCount = 0,
  onBackToLanding,
  currentUser,
  onOpenLoginModal,
  showCeoControls = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200 shadow-xs">
      {/* Top Banner if store is closed */}
      {!settings.isOpen && (
        <div className="bg-amber-400 text-amber-950 px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2">
          <span>Loja temporariamente fechada para novos pedidos</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
        {/* LADO SUPERIOR ESQUERDO: BARRA DE INFORMAÇÕES DA LOJA + LOGO */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Voltar para Home / Planos */}
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-1 p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Voltar para a página de apresentação"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Início</span>
            </button>
          )}

          {/* BOTÃO DA BARRA SUPERIOR ESQUERDA (INFORMAÇÕES DA LOJA) */}
          <button
            type="button"
            onClick={onOpenStoreInfo}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-slate-900 transition-all cursor-pointer shadow-2xs group"
            title="Abrir barra com todas as informações da loja (endereço, redes, pagamentos)"
            aria-label="Informações da Loja no lado superior esquerdo"
          >
            <Info className="w-4 h-4 text-amber-700 stroke-[2.4] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black hidden md:inline">Informações</span>
          </button>

          {/* Logo & Nome da Loja */}
          <button
            type="button"
            onClick={onViewMenuClick}
            className="flex items-center gap-2 text-left group cursor-pointer focus-visible:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm overflow-hidden group-hover:bg-amber-500 transition-colors shrink-0">
              {settings.logoBase64 ? (
                <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ForkKnifeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-amber-800 transition-colors font-display">
                  CARD<span className="text-amber-500">APP</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                  Digital
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate max-w-[120px] sm:max-w-xs">
                {settings.storeName}
              </p>
            </div>
          </button>
        </div>

        {/* LADO SUPERIOR DIREITO: SACOLA (+ OPÇÕES DE CEO APENAS QUANDO SOLICITADO) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Botão de Login do CEO apenas quando showCeoControls estiver ativo */}
          {showCeoControls && onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentUser
                  ? 'bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
              title={currentUser ? `Logado como ${currentUser.username}` : 'Entrar na conta da loja'}
            >
              {currentUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline font-black">{currentUser.username}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Entrar</span>
                </>
              )}
            </button>
          )}

          {/* Botão Sacola do Cliente */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-500 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none"
            aria-label="Sacola de Pedidos"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.4]" />
            <span className="text-xs hidden md:inline">Sacola</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[11px] font-black rounded-full bg-slate-950 text-amber-300">
                {cartCount}
              </span>
            )}
          </button>

          {/* TRÊS BARRAS DO CEO - EXIBIDO APENAS SE showCeoControls FOR TRUE */}
          {showCeoControls && onOpenCeoMenu && (
            <button
              type="button"
              onClick={onOpenCeoMenu}
              className="relative p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-slate-900 transition-all active:scale-95 cursor-pointer shadow-xs focus-visible:outline-none group"
              title="Menu de Administração (Três Barras)"
              aria-label="Menu do CEO"
            >
              <Menu className="w-5 h-5 text-slate-900 stroke-[2.5] group-hover:rotate-3 transition-transform" />

              {activeOrderCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-600 text-white text-[9px] font-black items-center justify-center">
                    {activeOrderCount}
                  </span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
