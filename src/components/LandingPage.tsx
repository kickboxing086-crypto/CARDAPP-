import React, { useState } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  DollarSign,
  QrCode,
  Printer,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  Clock,
  Zap,
  Store,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
  Lock,
  Shield,
  HelpCircle,
  FileText,
  MapPin,
  Utensils,
  Receipt,
  Headphones,
  Info,
  Sparkles,
  Award,
  Crown,
  Star,
} from 'lucide-react';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';

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
  const [monthlySales, setMonthlySales] = useState<number>(12000);
  const appFeePercentage = 0.27; // 27% market average
  const appLoss = monthlySales * appFeePercentage;
  const cardappCost = 24.99;
  const savedAmount = appLoss - cardappCost;

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
    const defaultText =
      'Olá! Gostaria de informações sobre o CARDAPP Digital (Plano Exclusivo R$ 24,99/mês) da SF TECNOLOGIA e como ativar para o meu estabelecimento.';
    const textToSend = customTopic || defaultText;
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const faqs = [
    {
      q: 'O CARDAPP desconta alguma porcentagem ou comissão sobre os pedidos?',
      a: 'Absolutamente NÃO. Nós trabalhamos com o modelo de assinatura fixa (R$ 24,99/mês). O faturamento de suas vendas é 100% seu, depositado diretamente em sua chave Pix ou recebido em sua maquininha, sem intermediários ou retenções.',
    },
    {
      q: 'Os clientes precisam baixar algum aplicativo na App Store ou Google Play?',
      a: 'Nenhum download é necessário. O cardápio abre em frações de segundo diretamente no navegador do celular do cliente, seja através do link oficial na biografia do Instagram/WhatsApp ou escaneando o QR Code exclusivo da mesa.',
    },
    {
      q: 'Como os pedidos chegam para a nossa equipe de atendimento e cozinha?',
      a: 'O sistema dispara automaticamente uma comanda formatada com todos os itens, adicionais, endereço e valor final direto no WhatsApp comercial do estabelecimento, além de exibi-la em tempo real no painel de gestão com opção de impressão térmica.',
    },
    {
      q: 'É possível emitir comandas para a cozinha em impressora térmica?',
      a: 'Sim! O sistema possui integração nativa com impressoras térmicas padrão de mercado (58mm e 80mm). Com apenas um clique no painel, a comanda sai impressa com o número do pedido em destaque e especificações de preparo.',
    },
    {
      q: 'Existe algum contrato de fidelidade ou taxa de cancelamento?',
      a: 'Nenhum contrato de fidelidade. A assinatura é mensal e pré-paga via Pix. Caso decida não renovar ao final do ciclo de 30 dias, o plano simplesmente expira sem qualquer tipo de multa ou burocracia.',
    },
    {
      q: 'Como funciona a renovação mensal e o aviso de vencimento?',
      a: 'Para sua total comodidade, o sistema avisa automaticamente quando faltarem 5 dias para o vencimento, liberando o QR Code Pix de renovação no seu painel para pagamento manual e emissão imediata de fatura com comprovante.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 selection:bg-amber-400/30 selection:text-white font-sans overflow-x-hidden">
      {/* Top Calming Announcement Bar */}
      <div className="bg-[#0A0D14] text-slate-300 py-2.5 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 border-b border-white/5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
        <span className="tracking-wide text-slate-300">
          🚀 <strong>7 Dias Grátis</strong> para testar sem compromisso • Plano Único <strong>R$ 24,99/mês</strong> • <strong>0% de Comissão</strong> • Renovação manual após o período
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#07080B]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/90 to-amber-600/90 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/10 shrink-0">
              <ForkKnifeIcon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-lg sm:text-xl tracking-tight text-white font-display block leading-none">
                CARDAPP
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider block mt-1">
                SF TECNOLOGIA GLOBAL
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300 tracking-wider">
            <a href="#como-funciona" className="hover:text-amber-400 transition-colors">Como Funciona</a>
            <a href="#telas" className="hover:text-amber-400 transition-colors">Experiência</a>
            <a href="#comparativo" className="hover:text-amber-400 transition-colors">Lucratividade</a>
            <a href="#recursos" className="hover:text-amber-400 transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-amber-400 transition-colors">Investimento</a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 border border-white/10 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5 text-amber-400/80" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar'}</span>
            </button>

            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-500/15 cursor-pointer active:scale-95"
              >
                <Store className="w-4 h-4" />
                <span>Solicitar Acesso</span>
              </button>
            )}

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                <span>Entrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="hidden xl:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
            >
              <ForkKnifeIcon className="w-4 h-4 text-amber-400" />
              <span>Ver Cardápio Ao Vivo</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION: CALM & EXPLANATORY */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-white/5 bg-gradient-to-b from-[#0B0E14] via-[#080A0E] to-[#07080B]">
        {/* Soft Tranquil Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-500/5 blur-[160px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-slate-300 text-xs font-medium shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>PLATAFORMA DE PEDIDOS ONLINE • ZERO COMISSÃO SOBRE VENDAS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight font-display leading-[1.15] max-w-4xl mx-auto">
            O padrão de excelência em <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400">Cardápio Digital</span> para o seu negócio
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Substitua comissões abusivas de até 27% por um sistema próprio de alta performance. Seus clientes pedem com elegância direto pelo celular e a comanda chega estruturada no seu WhatsApp e painel de gestão em tempo real.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-3 cursor-pointer"
            >
              <ForkKnifeIcon className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <span>Experimentar Cardápio de Demonstração</span>
            </button>

            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-black text-sm sm:text-base transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer backdrop-blur-md"
              >
                <span>Criar Minha Loja (R$ 24,99/mês)</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-black text-sm sm:text-base transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer backdrop-blur-md"
              >
                <span>Ativar via WhatsApp</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            )}
          </div>

          {/* Pillars */}
          <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
                0%
              </div>
              <h3 className="font-bold text-sm text-white">Comissão Zero</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Todo o faturamento das suas vendas é 100% direcionado para o seu caixa, sem deduções.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                Pix
              </div>
              <h3 className="font-bold text-sm text-white">Recebimento Direto</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O cliente paga direto na sua chave Pix, maquininha ou dinheiro, sem retenção de saldo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black">
                Web
              </div>
              <h3 className="font-bold text-sm text-white">Sem Downloads</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Abre instantaneamente no navegador do celular do cliente com alta velocidade.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                R$
              </div>
              <h3 className="font-bold text-sm text-white">Preço Fixo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assinatura sem surpresas de R$ 24,99/mês. Sem contratos de fidelidade ou carência.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: COMO FUNCIONA NA PRÁTICA (DETALHADO E EXPLICATIVO) */}
      <section id="como-funciona" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Passo a Passo Operacional
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
            Como o CARDAPP transforma o seu atendimento
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Uma jornada simples, elegante e altamente eficiente desenhada para estabelecimentos que valorizam agilidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/20">
              01
            </div>
            <h3 className="font-bold text-base text-white">Cadastro Inteligente</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você insere seus pratos, bebidas e categorias no painel exclusivo, definindo fotos, preços e adicionais opcionais (como ponto da carne ou bordas recheadas).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/20">
              02
            </div>
            <h3 className="font-bold text-base text-white">Divulgação Estratégica</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compartilhe seu link oficial na bio do Instagram e do WhatsApp, além de gerar plaquinhas com QR Code de alta resolução para as mesas do salão.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/20">
              03
            </div>
            <h3 className="font-bold text-base text-white">Pedido Fluido</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O cliente navega pelo catálogo visual, escolhe entre Delivery, Retirada ou Mesa, seleciona o bairro (com frete automático) e define a forma de pagamento.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/20">
              04
            </div>
            <h3 className="font-bold text-base text-white">WhatsApp & Cozinha</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O pedido é enviado instantaneamente para o seu WhatsApp e painel de controle, com opção de impressão térmica imediata para a equipe de produção.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: SHOWCASE INTERATIVO DAS TELAS */}
      <section id="telas" className="py-20 bg-[#0C0F15] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Demonstração Interativa
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
              Explore cada módulo do sistema em ação
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Veja o que seus clientes experimentam e como sua equipe gerencia cada operação com total precisão.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('menu')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
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
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
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
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
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
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
                activeShowcaseTab === 'tables'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code para Mesas</span>
            </button>
          </div>

          {/* Tab Content Showcase */}
          <div className="bg-[#12161F] rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            {activeShowcaseTab === 'menu' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold uppercase tracking-widest inline-block">
                    Visão do Consumidor Final
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                    Design responsivo, elegante e de navegação fluida
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Pensado para conversão imediata: o cliente visualiza categorias organizadas, fotos de alta qualidade, descrições detalhadas e adicionais customizáveis em segundos.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300 font-medium">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <strong>Cálculo Automático de Frete:</strong> Baseado no bairro selecionado pelo cliente.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <strong>Múltiplos Canais:</strong> Suporte simultâneo a Delivery, Retirada e Mesas.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <strong>Pagamento Flexível:</strong> Pix, Cartão na entrega ou Dinheiro com cálculo de troco.
                    </p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={onOpenDemoMenu}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all"
                    >
                      Testar Cardápio Agora
                    </button>
                  </div>
                </div>

                <div className="bg-[#0A0D14] rounded-3xl p-6 text-white max-w-sm mx-auto w-full space-y-4 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                        <ForkKnifeIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">Gastronomia Demo</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                      Aberto • Entrega Ativa
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#12161F] border border-white/10 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-xs text-white">Burger Trufado Supreme</h5>
                        <p className="text-[10px] text-slate-400">Pão brioche artesanal, blend 180g, queijo emmental e maionese trufada</p>
                      </div>
                      <span className="font-black text-amber-400 text-xs">R$ 36,00</span>
                    </div>
                    <div className="text-[10px] text-slate-300 pt-2 border-t border-white/10 flex justify-between items-center">
                      <span>Adicional: Bacon Crispy (+R$ 5,00)</span>
                      <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black rounded-lg">+ Adicionar</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-between font-black text-xs shadow-md">
                    <span>Ver Carrinho (1 item)</span>
                    <span>Total: R$ 41,00</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'whatsapp' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-widest inline-block">
                    Organização Comercial
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                    Comanda estruturada e profissional no seu WhatsApp
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Acabe com mensagens confusas ou dados faltando. O sistema formata automaticamente o pedido com nome, endereço completo, itens, adicionais e valor final.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300 font-medium">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Identificação imediata do cliente e telefone de contato.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Endereço detalhado com rua, número, bairro e referência.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Cálculo exato de troco e forma de pagamento escolhida.
                    </p>
                  </div>
                </div>

                <div className="bg-[#0B141A] rounded-3xl p-5 text-slate-100 border border-white/10 max-w-sm mx-auto w-full font-sans shadow-2xl">
                  <div className="bg-[#005C4B] text-white p-3 rounded-t-2xl text-xs font-bold flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Comercial da Loja</span>
                  </div>

                  <div className="bg-[#202C33] p-4 rounded-b-2xl rounded-tr-2xl shadow-inner text-[11px] space-y-1.5 font-mono mt-2 leading-relaxed text-slate-200">
                    <p className="font-bold text-emerald-400">📋 *NOVO PEDIDO CONFIRMADO*</p>
                    <p className="text-slate-500">--------------------------------</p>
                    <p>👤 *Cliente:* Mariana Souza</p>
                    <p>📱 *Telefone:* (11) 99887-6655</p>
                    <p>🛵 *Modalidade:* Delivery</p>
                    <p>📍 *Endereço:* Av. Paulista, 1000 - Apto 42</p>
                    <p className="text-slate-500">--------------------------------</p>
                    <p>• 2x Pizza Margherita (R$ 88,00)</p>
                    <p className="text-[10px] text-amber-300 pl-2">- Borda Recheada Catupiry (+R$ 12,00)</p>
                    <p className="text-slate-500">--------------------------------</p>
                    <p>Subtotal: R$ 100,00</p>
                    <p>Taxa de Entrega: R$ 8,00</p>
                    <p className="font-bold text-emerald-400 text-xs">*TOTAL: R$ 108,00*</p>
                    <p>💳 *Pagamento:* Pix Antecipado</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'kitchen' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-bold uppercase tracking-widest inline-block">
                    Produção & Expedição
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                    Impressão térmica profissional com 1 clique
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Conecte qualquer impressora térmica padrão (58mm ou 80mm via USB ou rede) e envie comandas limpas direto para a cozinha ou bar.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300 font-medium">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Número do pedido em destaque para agilizar a expedição.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Gestão dos status: Recebido, Em Preparo, Em Rota e Entregue.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Alerta sonoro automático a cada novo pedido recebido.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-dashed border-slate-400 font-mono text-[11px] text-slate-900 space-y-1.5 shadow-2xl max-w-xs mx-auto w-full select-text">
                  <div className="text-center font-bold text-[10px] text-slate-600">
                    ================================<br />
                    CARDAPP LUXURY • COZINHA<br />
                    ================================
                  </div>
                  <div className="text-center py-2">
                    <span className="text-xl font-black tracking-wider block text-slate-950">
                      PEDIDO #0142
                    </span>
                    <span className="text-[10px] bg-slate-950 text-white px-2 py-0.5 rounded font-bold uppercase">
                      DELIVERY • SALÃO VIP
                    </span>
                  </div>
                  <div className="text-center font-bold text-[10px] text-slate-600">
                    --------------------------------
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold">2x FILÉ MIGNON AO MOLHO</p>
                    <p className="text-[10px] text-slate-600 pl-2">- Ponto: Ao Ponto para Bem</p>
                    <p className="text-[10px] text-slate-600 pl-2">- Acompanhamento: Fritas</p>
                    <p className="font-bold mt-1">1x VINHO TINTO RESERVA</p>
                  </div>
                  <div className="text-center font-bold text-[10px] text-slate-600 pt-1">
                    --------------------------------
                  </div>
                  <div className="flex justify-between font-black text-xs">
                    <span>TOTAL:</span>
                    <span>R$ 168,00</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'tables' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold uppercase tracking-widest inline-block">
                    Atendimento no Salão
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                    QR Code individual e exclusivo para mesas
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Gere plaquinhas com QR Code para cada mesa do seu estabelecimento. O cliente escaneia com a câmera e o cardápio já abre com o número da mesa identificado.
                  </p>
                  <div className="space-y-3 text-xs text-slate-300 font-medium">
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Geração de arquivos prontos para impressão de alta qualidade.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Agilidade no atendimento sem necessidade de cardápios impressos.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Atualização de preços em tempo real direto pelo painel.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 text-white rounded-3xl p-8 text-center max-w-xs mx-auto w-full shadow-2xl border-2 border-amber-400/50 space-y-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block">
                    CARDÁPIO EXCLUSIVO DE MESA
                  </span>
                  <h4 className="text-3xl font-black font-display tracking-wider">MESA 12</h4>
                  <div className="bg-white p-4 rounded-2xl mx-auto w-40 h-40 flex items-center justify-center shadow-inner">
                    <QrCode className="w-32 h-32 text-slate-950" />
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Aponte a câmera do seu celular e faça seu pedido instantaneamente
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION: LUCRATIVIDADE & CALCULADORA COMPARATIVA */}
      <section id="comparativo" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Simulador de Lucro Real
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
            Quanto dinheiro você deixa de perder com o CARDAPP?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Simule abaixo o impacto financeiro de eliminar as comissões de marketplaces terceiros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 space-y-4">
            <span className="text-xs font-black uppercase text-red-400 block tracking-wider">
              Marketplaces Tradicionais (27% de Comissão)
            </span>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-black">✕</span>
                <span>Até 27% do valor de cada prato ou burger vendido vai direto para a taxa da plataforma.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-black">✕</span>
                <span>Seu faturamento fica retido e o repasse ocorre apenas após dias ou semanas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-black">✕</span>
                <span>O cliente pertence ao aplicativo, impedindo o seu relacionamento direto de marketing.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
            <span className="text-xs font-black uppercase text-emerald-400 block tracking-wider">
              Plataforma Própria CARDAPP Luxury
            </span>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Zero comissão. Você paga apenas a mensalidade fixa de R$ 24,99/mês.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>O dinheiro do cliente é depositado instantaneamente na sua conta ou maquininha.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Base de clientes 100% sua, com contatos de WhatsApp salvos para campanhas futuras.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Calculator Widget */}
        <div className="bg-[#12161F] rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-bold text-white">
                Faturamento mensal estimado em pedidos:
              </label>
              <span className="text-xl sm:text-3xl font-black text-amber-400 font-display">
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
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>R$ 3.000</span>
              <span>R$ 20.000</span>
              <span>R$ 40.000</span>
              <span>R$ 60.000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-center">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
              <span className="text-[10px] uppercase font-black text-red-400 block tracking-wider">Perda em Comissões (27%)</span>
              <span className="text-xl font-black text-red-400 block">-{formatCurrency(appLoss)}</span>
              <span className="text-[10px] text-slate-400">retido por terceiros</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Assinatura CARDAPP</span>
              <span className="text-xl font-black text-white block">R$ 24,99</span>
              <span className="text-[10px] text-slate-400">mensalidade fixa</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] uppercase font-black text-emerald-400 block tracking-wider">Lucro Líquido Salvo</span>
              <span className="text-xl font-black text-emerald-400 block">+{formatCurrency(savedAmount)}</span>
              <span className="text-[10px] text-emerald-300">dinheiro extra no seu caixa</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: RECURSOS OPERACIONAIS */}
      <section id="recursos" className="py-20 bg-[#0C0F15] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Arsenal Tecnológico
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
              Recursos de alta performance inclusos
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Ferramentas robustas desenvolvidas para otimizar a rotina do seu estabelecimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Gestão de Cardápio e Fotos</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Categorize produtos, ajuste preços instantaneamente, insira fotos e controle a disponibilidade de itens em tempo real.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Adicionais e Complementos</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure regras de complementos obrigatórios ou opcionais, adicionando valores extras ou oferecendo itens gratuitos.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Taxas de Entrega por Bairro</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Defina valores específicos e tempo estimado de entrega para cada região ou bairro atendido pela sua loja.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Impressão Térmica Dedicada</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Formatação automática otimizada para impressoras de 58mm e 80mm com acionamento em 1 clique.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">QR Code para Mesas do Salão</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Plaquinhas individuais para mesas e balcão, permitindo que o cliente peça direto do smartphone.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#12161F] border border-white/10 space-y-3 hover:border-amber-400/40 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Controle Financeiro & Faturas</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Acompanhe o faturamento consolidado por dia, faturas geradas e histórico de pagamentos registrados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: PLANO E INVESTIMENTO */}
      <section id="planos" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Investimento Transparente
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
            Plano Único e Sem Limites
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Acesso irrestrito a todas as funcionalidades sem cobranças por volume de vendas.
          </p>
        </div>

        <div className="bg-gradient-to-b from-[#161B26] to-[#10141D] rounded-3xl border-2 border-amber-500/40 p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-6 py-2 rounded-bl-2xl tracking-widest">
            Mais Popular • 0% Comissão
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-white/10 gap-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                CARDAPP Luxury Pro
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Assinatura Completa para Lojas
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Todas as ferramentas operacionais liberadas desde o primeiro dia.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs font-bold text-slate-400 block">Mensalidade Fixa</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-5xl font-black text-white font-display">R$ 24,99</span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md inline-block mt-2">
                Sem taxas adicionais por venda
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
              Tudo o que está incluído no seu plano:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-200 font-medium">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cardápio digital sem limite de pedidos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Integração de pedidos no WhatsApp</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Painel de gestão para múltiplos operadores</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Geração de QR Code para mesas e balcão</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Módulo de impressão térmica para cozinha</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Histórico de faturas e comprovantes oficiais</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Controle de Renovação Inteligente (Manual):</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O aviso e QR Code Pix para renovação da assinatura aparecem automaticamente quando faltarem <strong>5 dias</strong> para o vencimento, garantindo total controle manual sem cobranças automáticas indesejadas.
            </p>
          </div>

          <div className="pt-2">
            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Solicitar Acesso à Minha Loja</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Solicitar Acesso pelo WhatsApp</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION: FAQ EXPLICATIVO */}
      <section id="faq" className="py-20 bg-[#0C0F15] border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Esclarecimentos
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
              Perguntas Frequentes
            </h2>
            <p className="text-sm text-slate-400">
              Respostas detalhadas para todas as suas dúvidas sobre a plataforma.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#12161F] rounded-2xl border border-white/10 overflow-hidden shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white cursor-pointer hover:bg-white/[0.02] transition-colors"
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

      {/* SECTION: SUPORTE DIRETO */}
      <section className="py-16 bg-[#07080B] border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-[#161B26] to-[#10141D] border border-amber-500/30 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] uppercase font-black text-amber-400 tracking-widest">
                Suporte VIP & Ativação
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                Precisa de ajuda para configurar sua loja?
              </h3>
              <p className="text-xs text-slate-300">
                Nossa equipe de engenharia e suporte da SF TECNOLOGIA está pronta para lhe atender.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer transition-all flex items-center gap-2.5 shadow-lg shadow-amber-500/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar com o Suporte no WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-white/10 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <ForkKnifeIcon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-black text-base text-white font-display">
                CARDAPP <span className="text-amber-400">Luxury</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold uppercase tracking-wider">
              <a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
              <a href="#telas" className="hover:text-white transition-colors">Experiência</a>
              <a href="#comparativo" className="hover:text-white transition-colors">Lucratividade</a>
              <a href="#planos" className="hover:text-white transition-colors">Investimento</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Painel do Lojista</span>
              </button>
            )}
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 text-center sm:text-left">
            <p>
              CARDAPP Luxury Digital • Desenvolvido por <strong className="text-slate-400">SF TECNOLOGIA</strong> • Todos os direitos reservados.
            </p>
            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Atendimento e Suporte Oficial</span>
            </button>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => handleOpenWhatsapp()}
          className="group flex items-center gap-2.5 px-4.5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 active:scale-95 cursor-pointer border-2 border-white/20"
          title="Falar diretamente no WhatsApp"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6 fill-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
          <span className="text-xs font-black tracking-wide pr-1 hidden sm:inline-block uppercase">
            Atendimento WhatsApp
          </span>
        </button>
      </div>
    </div>
  );
};
