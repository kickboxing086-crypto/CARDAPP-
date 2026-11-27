import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  QrCode,
  Printer,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  Store,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  Lock,
  MapPin,
  Utensils,
  Receipt,
  Info,
  Sparkles,
  Crown,
} from 'lucide-react';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';
import { accountService } from '../services/accountService';
import { SubscriptionPlan } from '../types';

import heroLuxuryImg from '../assets/images/hero_luxury_restaurant_1795815749678.jpg';
import mobileOrderingImg from '../assets/images/showcase_mobile_ordering_1795815749949.jpg';
import kitchenPrinterImg from '../assets/images/showcase_kitchen_printer_1795815750783.jpg';
import tableQrImg from '../assets/images/showcase_table_qrcode_1795815751043.jpg';

interface LandingPageProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenDemoMenu: () => void;
  onOpenCeoPanelDirectly?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenDemoMenu,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'menu' | 'whatsapp' | 'kitchen' | 'tables'>('menu');
  const [monthlySales, setMonthlySales] = useState<number>(15000);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    accountService.getSubscriptionPlans().filter((p) => p.isActive)
  );

  useEffect(() => {
    const syncPlans = () => {
      setPlans(accountService.getSubscriptionPlans().filter((p) => p.isActive));
    };
    syncPlans();
    const unsub = accountService.subscribe(syncPlans);
    return () => unsub();
  }, []);

  const mensalPlan = plans.find((p) => p.period === 'mensal') || plans[0];
  const cardappCost = mensalPlan ? mensalPlan.price : 29.99;
  const appFeePercentage = 0.27;
  const appLoss = monthlySales * appFeePercentage;
  const savedAmount = Math.max(0, appLoss - cardappCost);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLandingLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?view=landing`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenWhatsapp = (customTopic?: string) => {
    const defaultText = `Olá! Gostaria de testar minha loja por 5 dias grátis no CARDAPP Luxury e conhecer os planos disponíveis.`;
    const textToSend = customTopic || defaultText;
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAcquirePlan = (plan: SubscriptionPlan) => {
    if (onOpenRegister) {
      onOpenRegister();
      return;
    }
    handleOpenWhatsapp(
      `Olá! Quero testar minha loja por 5 dias grátis e contratar o plano "${plan.name}" (${formatCurrency(plan.price)}) no CARDAPP Luxury.`
    );
  };

  const faqs = [
    {
      q: 'Como funciona o período de 5 dias grátis para testar minha loja?',
      a: 'Ao criar sua conta em menos de dois minutos, sua loja já nasce liberada com todos os recursos premium por 5 dias corridos sem cobrar cartão nem exigir compromisso. Você monta seu cardápio, compartilha seu link oficial e recebe pedidos reais antes de decidir pela assinatura.',
    },
    {
      q: 'O CARDAPP desconta alguma porcentagem ou comissão sobre os pedidos?',
      a: `Absolutamente NÃO. Trabalhamos com assinatura fixa sem taxas por venda. Todo o faturamento de seus pedidos é 100% seu, depositado diretamente em sua chave Pix ou recebido na maquininha sem intermediários.`,
    },
    {
      q: 'Os clientes precisam baixar algum aplicativo na App Store ou Google Play?',
      a: 'Nenhum download é necessário. O cardápio abre instantaneamente no navegador de qualquer celular, seja pelo link na bio do Instagram, WhatsApp ou QR Code exclusivo da mesa.',
    },
    {
      q: 'Como os pedidos chegam para a equipe de atendimento e cozinha?',
      a: 'O sistema gera uma comanda estruturada com todos os itens, adicionais, endereço e pagamento direto no WhatsApp comercial da sua loja e no painel em tempo real, com alerta sonoro e impressão térmica em 1 clique.',
    },
    {
      q: 'É possível imprimir comandas na cozinha em impressora térmica?',
      a: 'Sim. O sistema possui formatação nativa para impressoras térmicas padrão de 58mm e 80mm, destacando o número do pedido, modalidade e observações de preparo.',
    },
    {
      q: 'Existe contrato de fidelidade ou multa de cancelamento?',
      a: 'Nenhum contrato de fidelidade. Você testa por 5 dias grátis e, após ativar seu plano, escolhe o ciclo que melhor atende ao seu negócio sem cobranças automáticas surpresa.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#06070A] text-slate-100 selection:bg-amber-400/30 selection:text-white font-sans overflow-x-hidden">
      {/* Top Hospitality Announcement Strip */}
      <div className="bg-[#0B0D13] text-slate-300 py-2.5 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 border-b border-white/10">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="tracking-wide text-slate-300">
          Experimente sua própria loja por <strong className="text-amber-300">5 dias grátis</strong> · Plano a partir de{' '}
          <strong className="text-white tabular-nums">{formatCurrency(cardappCost)}</strong> ·{' '}
          <strong className="text-emerald-400">0% de comissão</strong>
        </span>
      </div>

      {/* Single-Line Top Bar (3 Zones) */}
      <header className="sticky top-0 z-40 bg-[#06070A]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Zone A: Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/15 shrink-0">
              <ForkKnifeIcon className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="whitespace-nowrap">
              <span className="font-serif font-bold text-lg tracking-wide text-white block leading-none">
                CARDAPP <span className="text-amber-400 font-normal italic">Luxury</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-[0.2em] uppercase block mt-1">
                SF Tecnologia
              </span>
            </div>
          </div>

          {/* Zone B: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-300 tracking-wide whitespace-nowrap">
            <a href="#como-funciona" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Como Funciona
            </a>
            <a href="#telas" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Experiência
            </a>
            <a href="#comparativo" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Lucratividade
            </a>
            <a href="#recursos" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Recursos
            </a>
            <a href="#planos" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Planos
            </a>
            <a href="#faq" className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Dúvidas
            </a>
          </nav>

          {/* Zone C: Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 border border-white/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{copiedLink ? 'Copiado' : 'Compartilhar'}</span>
            </button>

            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Testar 5 Dias Grátis</span>
              </button>
            )}

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Entrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <ForkKnifeIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Cardápio Ao Vivo</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION: LUXURY EDITORIAL ATMOSPHERE */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background photography with soft obsidian scrim */}
        <div className="absolute inset-0 bg-[#07090E]">
          <img
            src={heroLuxuryImg}
            alt="Ambiente gastronômico refinado com cardápio digital"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06070A]/90 via-[#06070A]/75 to-[#06070A]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070A] via-[#06070A]/75 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-7 space-y-7 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-400">
                Excelência em Pedidos Digitais · Zero Comissão
              </p>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.35rem] font-bold text-white tracking-tight leading-[1.12]">
                Seu restaurante merece um cardápio à altura da sua{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 italic font-semibold">
                  gastronomia
                </span>
                .
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Receba pedidos impecáveis diretamente no WhatsApp e na cozinha da sua operação, sem
                intermediários e sem descontar comissão por venda. Seu cliente acessa instantaneamente
                pelo celular sem precisar baixar aplicativo.
              </p>

              {/* Motivating 5-Day Free Trial Editorial Callout */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border-l-2 border-amber-400 backdrop-blur-md max-w-xl">
                <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-medium">
                  <strong className="text-amber-300 font-semibold">
                    Dê o primeiro passo hoje sem riscos:
                  </strong>{' '}
                  abra sua loja agora, cadastre seus pratos com fotos exclusivas e{' '}
                  <strong className="text-white underline decoration-amber-400/70 underline-offset-4">
                    teste tudo gratuitamente por 5 dias
                  </strong>{' '}
                  para ver seus próprios clientes comprando direto do seu link antes de investir um
                  centavo.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {onOpenRegister ? (
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="px-7 py-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-sm transition-all shadow-2xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Testar Minha Loja 5 Dias Grátis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsapp()}
                    className="px-7 py-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-sm transition-all shadow-2xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Começar 5 Dias Grátis Agora</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenDemoMenu}
                  className="px-7 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 font-semibold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer backdrop-blur-md"
                >
                  <ForkKnifeIcon className="w-4 h-4 text-amber-400" />
                  <span>Explorar Cardápio Ao Vivo</span>
                </button>
              </div>
            </div>

            {/* Hero Framed Image Composition */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-amber-400/25 bg-[#0D1017] shadow-2xl">
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden">
                  <img
                    src={heroLuxuryImg}
                    alt="Mesa elegante de restaurante com cardápio digital no smartphone"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070A] via-[#06070A]/85 to-transparent p-6 pt-14">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-amber-400 font-semibold block">
                        Acesso Instantâneo
                      </span>
                      <p className="font-serif text-lg font-semibold text-white mt-0.5">
                        Link exclusivo e QR Code de mesa
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block">Comissão</span>
                      <span className="text-xl font-bold text-emerald-400 tabular-nums">0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Four Architectural Value Pillars */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-6 rounded-2xl bg-[#0D1017]/90 border border-white/10 space-y-2 hover:border-amber-400/40 transition-colors">
              <span className="text-lg font-serif font-bold text-emerald-400 tabular-nums block">0%</span>
              <h3 className="font-semibold text-sm text-white">Comissão Zero</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada real vendido pertence integralmente ao caixa do seu estabelecimento.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D1017]/90 border border-white/10 space-y-2 hover:border-amber-400/40 transition-colors">
              <span className="text-lg font-serif font-bold text-amber-300 block">Pix Direto</span>
              <h3 className="font-semibold text-sm text-white">Recebimento Imediato</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O cliente paga direto na sua chave Pix, maquininha ou dinheiro sem retenções.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D1017]/90 border border-white/10 space-y-2 hover:border-amber-400/40 transition-colors">
              <span className="text-lg font-serif font-bold text-sky-300 block">Web Express</span>
              <h3 className="font-semibold text-sm text-white">Sem Baixar Aplicativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Abre em qualquer celular no mesmo segundo pelo link oficial da sua marca.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D1017]/90 border border-white/10 space-y-2 hover:border-amber-400/40 transition-colors">
              <span className="text-lg font-serif font-bold text-amber-300 tabular-nums block">5 Dias</span>
              <h3 className="font-semibold text-sm text-white">Teste Grátis Real</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Experimente todas as ferramentas na prática antes de escolher o seu plano.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: COMO FUNCIONA */}
      <section id="como-funciona" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-14">
          <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
            Fluxo Operacional
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Como funciona na prática
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Quatro etapas objetivas para colocar seu restaurante no ar com apresentação de alto padrão.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#0D1017] border border-white/10 space-y-4 hover:border-amber-400/30 transition-colors">
            <span className="inline-flex w-10 h-10 rounded-xl bg-amber-400 text-slate-950 items-center justify-center font-bold text-sm tabular-nums">
              01
            </span>
            <h3 className="font-semibold text-base text-white">Cadastro Inteligente</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Insira seus pratos, bebidas, fotos e adicionais no painel exclusivo com preço e descrição refinada.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1017] border border-white/10 space-y-4 hover:border-amber-400/30 transition-colors">
            <span className="inline-flex w-10 h-10 rounded-xl bg-amber-400 text-slate-950 items-center justify-center font-bold text-sm tabular-nums">
              02
            </span>
            <h3 className="font-semibold text-base text-white">Link & QR Code</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Divulgue o endereço exclusivo da loja no Instagram e WhatsApp e gere plaquinhas elegantes para mesas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1017] border border-white/10 space-y-4 hover:border-amber-400/30 transition-colors">
            <span className="inline-flex w-10 h-10 rounded-xl bg-amber-400 text-slate-950 items-center justify-center font-bold text-sm tabular-nums">
              03
            </span>
            <h3 className="font-semibold text-base text-white">Pedido Fluido</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O cliente escolhe Delivery, Retirada ou Mesa, seleciona o bairro com taxa automática e finaliza em segundos.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1017] border border-white/10 space-y-4 hover:border-amber-400/30 transition-colors">
            <span className="inline-flex w-10 h-10 rounded-xl bg-amber-400 text-slate-950 items-center justify-center font-bold text-sm tabular-nums">
              04
            </span>
            <h3 className="font-semibold text-base text-white">WhatsApp & Cozinha</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              A comanda chega organizada no seu WhatsApp e painel com alerta sonoro e impressão térmica imediata.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: SHOWCASE VISUAL & INTERATIVO */}
      <section id="telas" className="py-20 bg-[#0A0D14] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
              Experiência Ao Vivo
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Cada detalhe desenhado para converter
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Combine apresentação gastronômica de luxo com velocidade operacional no salão e delivery.
            </p>
          </div>

          {/* Interactive Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('menu')}
              className={`px-5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'menu'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Cardápio no Celular</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('whatsapp')}
              className={`px-5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'whatsapp'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Comanda no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('kitchen')}
              className={`px-5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'kitchen'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Impressão Térmica</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('tables')}
              className={`px-5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'tables'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code para Mesas</span>
            </button>
          </div>

          {/* Tab Panel */}
          <div className="bg-[#10141E] rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl">
            {activeShowcaseTab === 'menu' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400 block">
                    Visão do Cliente Final
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-snug">
                    Navegação editorial fluida na palma da mão
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Categorias elegantes, fotos apetitosas e customização intuitiva para o cliente montar o pedido em segundos.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white">Frete Automático:</strong> taxa calculada pelo bairro selecionado.
                      </span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white">Todos os Canais:</strong> Delivery, Retirada no Balcão ou Mesa.
                      </span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white">Pagamento Direto:</strong> Pix, Cartão ou Dinheiro com cálculo de troco.
                      </span>
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenDemoMenu}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                    >
                      Explorar Cardápio Agora
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-slate-900">
                    <img
                      src={mobileOrderingImg}
                      alt="Cliente pedindo pelo celular em bistrô iluminado"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-[#090B11] rounded-2xl p-5 text-white w-full space-y-4 border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center">
                          <ForkKnifeIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-xs">Maison Bistro</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">Aberto Agora</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#121622] border border-white/10 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-semibold text-xs text-white">Burger Trufado Supreme</h5>
                          <p className="text-[10px] text-slate-400">
                            Brioche artesanal, blend 180g, emmental e aioli trufado
                          </p>
                        </div>
                        <span className="font-bold text-amber-400 text-xs tabular-nums shrink-0">R$ 36,00</span>
                      </div>
                      <div className="text-[10px] text-slate-300 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span>Bacon Crispy (+R$ 5,00)</span>
                        <span className="px-2 py-1 bg-amber-400 text-slate-950 font-bold rounded-md">+ Adicionar</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-between font-bold text-xs">
                      <span>Sacola (1 item)</span>
                      <span className="tabular-nums">R$ 41,00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'whatsapp' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400 block">
                    Organização Comercial
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-snug">
                    Comanda estruturada e impecável no seu WhatsApp
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Sem áudios longos nem pedidos incompletos. Cada compra chega formatada com nome, endereço, itens, adicionais e pagamento.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Dados completos do cliente e telefone verificados.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Endereço com bairro, número e ponto de referência.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Troco e método de pagamento destacados com clareza.</span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-slate-900">
                    <img
                      src={mobileOrderingImg}
                      alt="Pedido digital enviado direto ao WhatsApp"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-[#0B141A] rounded-2xl p-4 text-slate-100 border border-white/10 w-full shadow-xl">
                    <div className="bg-[#005C4B] text-white p-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Comercial</span>
                    </div>

                    <div className="bg-[#202C33] p-3.5 rounded-b-xl text-[11px] space-y-1 font-mono mt-1.5 leading-relaxed text-slate-200">
                      <p className="font-bold text-emerald-400">*NOVO PEDIDO CONFIRMADO*</p>
                      <p className="text-slate-500">------------------------</p>
                      <p>*Cliente:* Mariana Souza</p>
                      <p>*Telefone:* (55)999999999</p>
                      <p>*Modalidade:* Delivery</p>
                      <p>*Endereço:* Av. Central, 1000</p>
                      <p className="text-slate-500">------------------------</p>
                      <p>2x Pizza Margherita (R$ 88,00)</p>
                      <p className="text-[10px] text-amber-300 pl-2">+ Borda Catupiry (R$ 12,00)</p>
                      <p className="text-slate-500">------------------------</p>
                      <p>Frete: R$ 8,00</p>
                      <p className="font-bold text-emerald-400 text-xs tabular-nums">*TOTAL: R$ 108,00*</p>
                      <p>*Pagamento:* Pix Antecipado</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'kitchen' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400 block">
                    Produção & Expedição
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-snug">
                    Impressão térmica dedicada com apenas um clique
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Compatível com impressoras térmicas 58mm e 80mm para agilizar a praça quente, bar e expedição do salão.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Número da comanda em destaque para zero erros.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Status ao vivo para o cliente acompanhar o preparo.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Alerta sonoro imediato a cada novo pedido recebido.</span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-slate-900">
                    <img
                      src={kitchenPrinterImg}
                      alt="Chef na cozinha finalizando prato com comanda impressa"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-dashed border-slate-400 font-mono text-[11px] text-slate-900 space-y-1.5 shadow-xl w-full select-text">
                    <div className="text-center font-bold text-[10px] text-slate-600">
                      ================================
                      <br />
                      CARDAPP LUXURY · COZINHA
                      <br />
                      ================================
                    </div>
                    <div className="text-center py-2">
                      <span className="text-xl font-black tracking-wider block text-slate-950 tabular-nums">
                        PEDIDO #00142
                      </span>
                      <span className="text-[10px] bg-slate-950 text-white px-2 py-0.5 rounded font-bold uppercase">
                        DELIVERY · SALÃO VIP
                      </span>
                    </div>
                    <div className="text-center font-bold text-[10px] text-slate-600">
                      --------------------------------
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">2x FILÉ MIGNON AO MOLHO</p>
                      <p className="text-[10px] text-slate-600 pl-2">- Ponto: Ao Ponto</p>
                      <p className="text-[10px] text-slate-600 pl-2">- Guarnição: Risoto</p>
                      <p className="font-bold mt-1">1x VINHO TINTO RESERVA</p>
                    </div>
                    <div className="text-center font-bold text-[10px] text-slate-600 pt-1">
                      --------------------------------
                    </div>
                    <div className="flex justify-between font-black text-xs tabular-nums">
                      <span>TOTAL:</span>
                      <span>R$ 168,00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'tables' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400 block">
                    Atendimento no Salão
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-snug">
                    Plaquinhas QR Code exclusivas para cada mesa
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Gere displays de mesa personalizados para impressão imediata. O cliente aponta a câmera e o sistema já identifica o número da mesa.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Atualize preços e disponibilidade na hora sem reimprimir nada.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Maior giro de mesas e aumento no ticket médio de bebidas.</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Design refinado pronto para impressão em alta definição.</span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-slate-900">
                    <img
                      src={tableQrImg}
                      alt="Display dourado com QR Code em mesa de restaurante"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-[#090B11] text-white rounded-2xl p-6 text-center w-full shadow-xl border border-amber-400/40 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 block">
                      CARDÁPIO DIGITAL DE MESA
                    </span>
                    <h4 className="font-serif text-2xl font-bold tracking-wide">MESA 12</h4>
                    <div className="bg-white p-3.5 rounded-xl mx-auto w-36 h-36 flex items-center justify-center">
                      <QrCode className="w-28 h-28 text-slate-950" />
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Aponte a câmera do celular e peça sem aguardar o garçom
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION: LUCRATIVIDADE & SIMULADOR */}
      <section id="comparativo" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
            Simulador de Rentabilidade
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Proteja a margem do seu restaurante todo mês
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Compare o custo de pagar 27% em comissões por venda versus manter seu próprio canal digital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/25 space-y-4">
            <span className="text-xs font-bold uppercase text-red-400 block tracking-wider">
              Aplicativos Tradicionais (27% de Comissão)
            </span>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>Até 27% de cada prato vendido é retido em taxas de intermediação.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>O dinheiro fica retido e só cai na conta semanas depois.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>Seus clientes ficam expostos à concorrência na mesma vitrine.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-4">
            <span className="text-xs font-bold uppercase text-emerald-400 block tracking-wider">
              Canal Próprio CARDAPP Luxury
            </span>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>
                  Zero comissão sobre pedidos. Mensalidade fixa a partir de{' '}
                  <strong className="text-white tabular-nums">{formatCurrency(cardappCost)}</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Recebimento direto na sua chave Pix ou maquininha no ato do pedido.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Sua marca no centro da experiência, sem distrações de concorrentes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Calculator */}
        <div className="bg-[#0D1017] rounded-3xl border border-white/10 p-7 sm:p-10 shadow-2xl space-y-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm sm:text-base font-semibold text-white">
                Faturamento mensal estimado em pedidos:
              </label>
              <span className="text-xl sm:text-2xl font-bold text-amber-300 font-mono tabular-nums">
                {formatCurrency(monthlySales)}
              </span>
            </div>

            <input
              type="range"
              min="3000"
              max="60000"
              step="1000"
              value={monthlySales}
              onChange={(e) => setMonthlySales(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-xs font-medium text-slate-500 tabular-nums">
              <span>R$ 3.000</span>
              <span>R$ 20.000</span>
              <span>R$ 40.000</span>
              <span>R$ 60.000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-center">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                Perda em Comissões (27%)
              </span>
              <span className="text-xl font-bold text-red-400 block tabular-nums">-{formatCurrency(appLoss)}</span>
              <span className="text-[10px] text-slate-400">retido por aplicativos</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Assinatura CARDAPP
              </span>
              <span className="text-xl font-bold text-white block tabular-nums">{formatCurrency(cardappCost)}</span>
              <span className="text-[10px] text-slate-400">valor fixo mensal</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                Economia Direta no Caixa
              </span>
              <span className="text-xl font-bold text-emerald-400 block tabular-nums">
                +{formatCurrency(savedAmount)}
              </span>
              <span className="text-[10px] text-emerald-300">lucro preservado por mês</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: RECURSOS */}
      <section id="recursos" className="py-20 bg-[#0A0D14] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-12">
            <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
              Recursos Operacionais
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Tudo o que sua operação exige no dia a dia
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">Gestão de Cardápio & Fotos</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Organize categorias, atualize preços instantaneamente e controle itens disponíveis em tempo real.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">Adicionais & Combos</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure complementos, bordas, pontos da carne e promoções automáticas para elevar o ticket médio.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">Taxas de Entrega por Bairro</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Defina valores exatos e prazos de entrega para cada região atendida pelo seu delivery.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">Impressão Térmica 58/80mm</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Comandas legíveis com numeração sequencial do dia em destaque para agilizar a cozinha.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">QR Code de Salão</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Plaquinhas individuais por mesa prontas para imprimir e acelerar o atendimento presencial.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10141E] border border-white/10 space-y-3 hover:border-amber-400/35 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base text-white">Relatório Financeiro Diário</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Acompanhe o faturamento consolidado do seu negócio e o histórico completo de pedidos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: PLANOS, PROMOÇÕES & CONVITE 5 DIAS GRÁTIS */}
      <section id="planos" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-10">
          <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
            Planos & Benefícios
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Comece com 5 dias grátis e escolha o seu plano
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Não deixe para amanhã as vendas que você pode fazer hoje: crie sua conta gratuitamente,
            personalize sua loja em minutos e{' '}
            <strong className="text-amber-300">
              sinta o resultado real por 5 dias sem pagar nada
            </strong>
            .
          </p>
        </div>

        {/* Dynamic Plans Grid synced with SuperAdmin plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isFeatured = plan.period === 'mensal' || index === 0;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-7 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isFeatured
                    ? 'bg-gradient-to-b from-[#171C28] to-[#0E121A] border-2 border-amber-400/50 shadow-2xl shadow-amber-500/10'
                    : 'bg-[#0D1017] border border-white/10 hover:border-amber-400/35'
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-4 py-1.5 rounded-bl-xl tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>Mais Escolhido</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400 block">
                      {plan.durationDays >= 36500
                        ? 'Acesso Vitalício'
                        : `${plan.durationDays} dias de licença`}
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-white mt-1">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {plan.description || 'Acesso completo ao cardápio digital, pedidos no WhatsApp e painel administrativo.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-white font-mono tabular-nums">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {plan.durationDays >= 36500 ? 'pagamento único' : `/ ${plan.durationDays} dias`}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 block mt-1">
                      5 dias grátis no cadastro + 0% comissão
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Pedidos ilimitados sem taxa por venda</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Comandas no WhatsApp & Impressão Térmica</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Link oficial e QR Code exclusivo para mesas</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleAcquirePlan(plan)}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFeatured
                        ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white border border-white/15'
                    }`}
                  >
                    <span>Testar 5 Dias Grátis & Adquirir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-[#0D1017] border border-white/10 text-xs text-slate-300 flex items-start gap-3 max-w-3xl mx-auto">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Transparência na Renovação:</strong> Você inicia com 5 dias grátis completos e, após o período de testes, escolhe qualquer plano acima direto no painel da sua loja sem cobranças automáticas indesejadas.
          </p>
        </div>
      </section>

      {/* SECTION: FAQ */}
      <section id="faq" className="py-20 bg-[#0A0D14] border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <span className="text-[11px] font-semibold uppercase text-amber-400 tracking-[0.26em] block">
              Dúvidas Frequentes
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tudo esclarecido antes de começar
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#10141E] rounded-2xl border border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-white cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL MOTIVATIONAL CTA BANNER */}
      <section className="py-16 bg-[#06070A] border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#151A26] via-[#111520] to-[#0D1017] border border-amber-400/30 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-[0.22em] block">
                Comece Hoje Mesmo · 5 Dias Grátis
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold">
                Pronto para testar sua loja por 5 dias grátis?
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Nossa equipe da SF TECNOLOGIA também oferece suporte direto pelo WhatsApp para ajudar você a publicar seu cardápio hoje.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {onOpenRegister && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                >
                  <Store className="w-4 h-4" />
                  <span>Criar Loja Grátis</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Falar no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#050609] text-slate-400 py-12 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center">
                <ForkKnifeIcon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-serif font-bold text-base text-white tracking-wide">
                CARDAPP <span className="text-amber-400 italic font-normal">Luxury</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium tracking-wide">
              <a href="#como-funciona" className="hover:text-white transition-colors">
                Como Funciona
              </a>
              <a href="#telas" className="hover:text-white transition-colors">
                Experiência
              </a>
              <a href="#comparativo" className="hover:text-white transition-colors">
                Lucratividade
              </a>
              <a href="#planos" className="hover:text-white transition-colors">
                Planos
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                FAQ
              </a>
            </div>

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 font-semibold text-xs cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Painel do Lojista</span>
              </button>
            )}
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 text-center sm:text-left">
            <p>
              CARDAPP Luxury Digital · Desenvolvido por <strong className="text-slate-400">SF TECNOLOGIA</strong> · Todos os direitos reservados.
            </p>
            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Atendimento e Suporte Oficial</span>
            </button>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING BUTTON (No animate-ping dot) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => handleOpenWhatsapp()}
          className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer border border-white/20"
          title="Falar diretamente no WhatsApp"
        >
          <MessageCircle className="w-5 h-5 fill-white" />
          <span className="text-xs font-bold tracking-wide pr-0.5 hidden sm:inline-block uppercase">
            Atendimento WhatsApp
          </span>
        </button>
      </div>
    </div>
  );
};
