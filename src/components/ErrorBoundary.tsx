import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ForkKnifeIcon } from './ForkKnifeIcon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/?view=cliente';
  };

  private handleGoHome = () => {
    window.location.href = '/?view=landing';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-4 text-slate-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-amber-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-md">
              <ForkKnifeIcon className="w-7 h-7 stroke-[2.3]" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-950 font-display">
                CARDAPP DIGITAL
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Ocorreu uma pequena instabilidade ao carregar a tela.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed break-words font-mono">
                {this.state.error?.message || 'Erro inesperado ao renderizar componente.'}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Abrir Cardápio</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200 active:scale-98"
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
