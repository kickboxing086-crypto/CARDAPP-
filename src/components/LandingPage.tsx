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
  // Showcase Tab State
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'menu' | 'whatsapp' | 'kitchen' | 'tables'>('menu');

  // Calculator State (Baseado no comparativo de mercado)
  const [monthlySales, setMonthlySales] = useState<number>(10000);
  const appFeePercentage = 0.27; // 27% média praticada por marketplaces terceiros de delivery
  const appLoss = monthlySales * appFeePercentage;
  const cardappCost = 2.00; // Valor da assinatura a partir de R$ 2,00/mês
  const savedAmount = appLoss - cardappCost;

  // FAQ State
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
      'Olá! Gostaria de informações sobre o CARDAPP Digital (Plano R$ 24,99/mês) da SF TECNOLOGIA e como ativar para o meu estabelecimento.';
    const textToSend = customTopic || defaultText;
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const faqs = [
    {
      q: 'O CARDAPP desconta alguma porcentagem ou comissão sobre os pedidos?',
      a: 'NÃO. O sistema não cobra comissão por pedido vendido. O valor total pago pelo cliente vai 100% direto para o seu caixa (seja por Pix na sua chave bancária, cartão na sua maquininha ou dinheiro na entrega). O único custo do sistema é a assinatura da plataforma de R$ 24,99 por mês.',
    },
    {
      q: 'Como o cliente faz o pedido? Ele precisa baixar algum aplicativo?',
      a: 'Não precisa baixar nada. O cardápio abre instantaneamente no navegador do celular do cliente através do link oficial (que você pode colocar na bio do Instagram e WhatsApp) ou ao escanear o QR Code da mesa. O cliente monta o pedido, seleciona adicionais e clica para enviar.',
    },
    {
      q: 'Como o pedido chega para a minha equipe?',
      a: 'O pedido chega formatado diretamente no WhatsApp comercial cadastrado com todos os itens, complementos, endereço de entrega, taxa calculada e forma de pagamento. Além disso, o pedido aparece em tempo real no Painel de Pedidos do sistema para controle de status e impressão térmica.',
    },
    {
      q: 'Como funciona a impressão de comandas para a cozinha?',
      a: 'O sistema possui módulo de impressão térmica integrado compatível com impressoras térmicas padrão de mercado (58mm e 80mm). Com 1 clique no painel, a comanda sai impressa com o número do pedido em destaque, itens e observações para a equipe da cozinha preparar.',
    },
    {
      q: 'Existe contrato de fidelidade, carência ou taxa de cancelamento?',
      a: 'Não existe fidelidade e nem multa. A assinatura é mensal e pré-paga via Pix. Se você não desejar renovar ao final do período de 30 dias, o plano expira sem cobranças futuras ou penalidades.',
    },
    {
      q: 'Como funciona a renovação e a liberação do QR Code de pagamento?',
      a: 'Para manter tudo organizado e sem pagamentos antecipados desnecessários, o QR Code Pix de renovação só fica visível no painel quando faltarem 5 dias para o vencimento do plano. A cada pagamento confirmado, o sistema gera automaticamente uma fatura oficial com comprovante registrado no seu histórico.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 selection:bg-amber-400 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* Top Banner Informativo e Concreto */}
      <div className="bg-slate-950 text-amber-300 py-2.5 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <span className="truncate max-w-full">
          Plataforma de Cardápio Digital • Plano único <strong>R$ 24,99/mês</strong> • 0% de comissão por venda
        </span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Logo e Identificação Oficial */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <ForkKnifeIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-950 font-display block leading-none">
                CARDAPP <span className="text-xs text-amber-600 font-semibold">Digital</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                SF TECNOLOGIA
              </span>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#como-funciona" className="hover:text-amber-600 transition-colors">Como Funciona</a>
            <a href="#telas" className="hover:text-amber-600 transition-colors">Telas do Sistema</a>
            <a href="#recursos" className="hover:text-amber-600 transition-colors">Recursos</a>
            <a href="#comparativo" className="hover:text-amber-600 transition-colors">Comparativo</a>
            <a href="#planos" className="hover:text-amber-600 transition-colors">Valores</a>
            <a href="#faq" className="hover:text-amber-600 transition-colors">Dúvidas</a>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              title="Copiar Link da Página"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5 text-amber-600" />}
              <span className="text-[11px]">{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Solicitar Acesso</span>
              </button>
            )}

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                title="Entrar no painel da loja"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Entrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
            >
              <ForkKnifeIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Ver Cardápio Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION: INFORMAÇÕES DIRETAS, REAIS E CONCRETAS */}
      <section className="relative overflow-hidden pt-12 pb-14 sm:pt-18 sm:pb-20 border-b border-slate-200 bg-gradient-to-b from-amber-50/40 via-white to-white">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          {/* Selo Institucional Concreto */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 text-white text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.4]" />
            <span>CARDÁPIO DIGITAL E SISTEMA DE PEDIDOS DIRETO NO WHATSAPP</span>
          </div>

          {/* Título Principal Concreto */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight font-display leading-[1.18] max-w-4xl mx-auto">
            Receba pedidos organizados no seu WhatsApp e elimine as comissões de até 27%
          </h1>

          {/* Descrição Real e Precisa */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Plataforma web para restaurantes, pizzarias, hamburguerias, lanchonetes e bares. O cliente acessa pelo navegador do celular, monta o pedido com adicionais e envia a comanda calculada direto para o seu WhatsApp e para o painel de pedidos.
          </p>

          {/* Botões de Ação Transparentes */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ForkKnifeIcon className="w-5 h-5 text-slate-950 stroke-[2.3]" />
              <span>Testar Cardápio de Demonstração (Ao Vivo)</span>
            </button>

            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm sm:text-base transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Criar Minha Loja (A partir de R$ 2,00/mês)</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm sm:text-base transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Solicitar Acesso via WhatsApp</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            )}
          </div>

          {/* 4 Fatos Concretos da Ferramenta */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">1. Comissão Zero</span>
              <p className="text-xs font-bold text-slate-900">0% de taxa por pedido</p>
              <p className="text-[11px] text-slate-500">100% do dinheiro das vendas fica no seu caixa.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-700 block">2. Pagamento Direto</span>
              <p className="text-xs font-bold text-slate-900">Sem retenção de valores</p>
              <p className="text-[11px] text-slate-500">O cliente paga direto na sua chave Pix, maquininha ou dinheiro.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-700 block">3. 100% no Navegador</span>
              <p className="text-xs font-bold text-slate-900">Sem downloads</p>
              <p className="text-[11px] text-slate-500">Funciona em qualquer celular sem ocupar memória do cliente.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">4. Valor Fixo</span>
              <p className="text-xs font-bold text-slate-900">A partir de R$ 2,00/mês</p>
              <p className="text-[11px] text-slate-500">Sem fidelidade, renovação mensal via Pix com fatura oficial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: COMO FUNCIONA NA PRÁTICA (O FLUXO REAL DO INÍCIO AO FIM) */}
      <section id="como-funciona" className="py-14 sm:py-20 max-w-5xl mx-auto px-4">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
            Fluxo Real de Funcionamento
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
            Como funciona a operação do CARDAPP no seu dia a dia
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Sem processos complicados. Entenda exatamente como o sistema funciona desde a configuração até a saída do pedido para entrega ou mesa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
              1
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Você cadastra o cardápio
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No painel do lojista, você insere os produtos com fotos, preços, categorias e opções de adicionais (ex: ponto da carne, queijo extra, borda).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <span className="w-7 h-7 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xs">
              2
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Divulga o link e QR Code
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Você coloca o link oficial na bio do seu Instagram, no WhatsApp e imprime as plaquinhas com QR Code para colocar nas mesas e no balcão.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
              3
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              O cliente monta o pedido
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pelo celular, o cliente visualiza os itens, escolhe se é Delivery, Retirada ou Mesa, seleciona o bairro (com taxa calculada) e a forma de pagamento.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <span className="w-7 h-7 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xs">
              4
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Pedido no WhatsApp & Cozinha
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              A comanda calculada chega no seu WhatsApp comercial e no painel de pedidos em tempo real. Você pode imprimir a comanda térmica com 1 clique.
            </p>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: TELAS REAIS DO SISTEMA (SHOWCASE INTERATIVO) */}
      <section id="telas" className="py-14 sm:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
              Demonstração das Funcionalidades
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              Veja exatamente como cada tela funciona
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Clique nas abas abaixo para ver o funcionamento do cardápio do cliente, da comanda de WhatsApp, do painel da cozinha e do QR Code de mesa.
            </p>
          </div>

          {/* Abas */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('menu')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'menu'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Cardápio no Celular</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('whatsapp')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'whatsapp'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Comanda no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('kitchen')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'kitchen'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Impressão Térmica (Cozinha)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab('tables')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeShowcaseTab === 'tables'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code para Mesas</span>
            </button>
          </div>

          {/* Exibição da Tela Selecionada */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            {activeShowcaseTab === 'menu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider inline-block">
                    Visão do Seu Cliente
                  </span>
                  <h3 className="text-xl font-black text-slate-950 font-display">
                    Cardápio responsivo, visual e intuitivo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    O cardápio foi desenhado para facilitar a escolha rápida: produtos organizados por categorias, fotos reais, valor unitário claro e seleção de adicionais (ex: molhos, queijo extra, tamanho ou ponto da carne).
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <strong>Cálculo por bairro:</strong> O cliente escolhe o bairro e o frete é somado automaticamente.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <strong>3 Modalidades:</strong> Suporte a Entrega (Delivery), Retirada no Balcão ou Consumo na Mesa.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <strong>Formas de pagamento:</strong> Pix, Cartão na maquininha ou Dinheiro com cálculo de troco.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenDemoMenu}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-xs transition-all"
                    >
                      Abrir Cardápio de Demonstração
                    </button>
                  </div>
                </div>

                {/* Exemplo Real do Cardápio */}
                <div className="bg-slate-900 rounded-3xl p-5 text-white max-w-sm mx-auto w-full space-y-3 font-sans border-2 border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                        <ForkKnifeIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">Hamburgueria Demonstração</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      Aberto
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-xs text-white">Burger Artesanal Duplo</h5>
                        <p className="text-[10px] text-slate-400">Pão brioche, 2 carnes 120g, queijo cheddar e bacon</p>
                      </div>
                      <span className="font-black text-amber-400 text-xs">R$ 28,00</span>
                    </div>
                    <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-700/60 flex justify-between items-center">
                      <span>Adicional: Bacon Extra (+R$ 4,00)</span>
                      <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-md">+ Adicionar</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-between font-black text-xs">
                    <span>Ver Pedido (1 item)</span>
                    <span>Total: R$ 32,00</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'whatsapp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 text-[11px] font-bold uppercase tracking-wider inline-block">
                    Mensagem Padronizada
                  </span>
                  <h3 className="text-xl font-black text-slate-950 font-display">
                    Comanda completa direto no seu WhatsApp
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Quando o cliente finaliza o pedido, o sistema monta a mensagem de texto com toda a estrutura necessária para o seu atendimento. Sem mensagens picadas, sem dados incompletos e sem erros de conta.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Nome do cliente e telefone de contato identificados.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Endereço detalhado com rua, número, bairro, complemento e referência.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Lista de itens, adicionais escolhidos, taxa de entrega e valor final.
                    </p>
                  </div>
                </div>

                {/* Exemplo Real do WhatsApp */}
                <div className="bg-[#E5DDD5] rounded-3xl p-5 text-slate-900 border border-slate-300 max-w-sm mx-auto w-full font-sans">
                  <div className="bg-[#075E54] text-white p-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Comercial da Loja</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-b-xl rounded-tr-xl shadow-xs text-[11px] space-y-1 font-mono mt-2 leading-tight">
                    <p className="font-bold text-emerald-800">📋 *NOVO PEDIDO RECEBIDO*</p>
                    <p>--------------------------------</p>
                    <p>👤 *Cliente:* João Silva</p>
                    <p>📱 *Telefone:* (11) 98765-4321</p>
                    <p>🛵 *Tipo:* Delivery</p>
                    <p>📍 *Endereço:* Rua das Palmeiras, 120 - Centro</p>
                    <p>--------------------------------</p>
                    <p>• 1x Pizza Calabresa Grande (R$ 48,00)</p>
                    <p className="text-[10px] text-slate-600 pl-2">- Adicional: Borda de Catupiry (+R$ 6,00)</p>
                    <p>• 1x Refrigerante Guaraná 2L (R$ 10,00)</p>
                    <p>--------------------------------</p>
                    <p>Subtotal: R$ 64,00</p>
                    <p>Taxa de Entrega (Centro): R$ 5,00</p>
                    <p className="font-bold text-slate-900">*TOTAL: R$ 69,00*</p>
                    <p>💳 *Pagamento:* Pix na entrega</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'kitchen' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 text-amber-400 text-[11px] font-bold uppercase tracking-wider inline-block">
                    Produção & Impressora Térmica
                  </span>
                  <h3 className="text-xl font-black text-slate-950 font-display">
                    Impressão com 1 clique para a cozinha
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Você pode conectar qualquer impressora térmica padrão (58mm ou 80mm via USB ou rede) no seu computador ou celular e imprimir a comanda formatada diretamente pelo navegador com apenas um clique.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Número do pedido em tamanho grande para fácil visualização na expedição.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Controle dos 4 status: Recebido, Em Preparo, Em Rota e Entregue.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Alerta sonoro configurável a cada novo pedido que entra no sistema.
                    </p>
                  </div>
                </div>

                {/* Exemplo Real da Comanda Térmica */}
                <div className="bg-white rounded-2xl p-4 border border-dashed border-slate-400 font-mono text-[11px] shadow-sm max-w-xs mx-auto w-full text-slate-900 space-y-1 select-text">
                  <div className="text-center font-bold text-[10px]">
                    ================================<br />
                    CARDAPP DIGITAL - EXPEDIÇÃO<br />
                    ================================
                  </div>
                  <div className="text-center py-1">
                    <span className="text-xl font-black tracking-wider block">
                      PEDIDO 00105
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase">
                      DELIVERY • CENTRO
                    </span>
                  </div>
                  <div className="text-center font-bold text-[10px]">
                    --------------------------------
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold">1x BURGER SMASH BACON</p>
                    <p className="text-[10px] pl-2">- Queijo Cheddar Extra</p>
                    <p className="text-[10px] pl-2">- Obs: Sem cebola</p>
                    <p className="font-bold mt-1">1x BATATA FRITA INDIVIDUAL</p>
                  </div>
                  <div className="text-center font-bold text-[10px] pt-1">
                    --------------------------------
                  </div>
                  <div className="flex justify-between font-black text-xs">
                    <span>TOTAL:</span>
                    <span>R$ 38,00</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'tables' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider inline-block">
                    Atendimento no Salão
                  </span>
                  <h3 className="text-xl font-black text-slate-950 font-display">
                    QR Code individual para mesas e balcão
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    O sistema gera um link e QR Code exclusivo para cada mesa cadastrada. O cliente senta, escaneia a plaquinha com a câmera do celular e o cardápio já abre com o número da mesa pré-preenchido.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Geração de arquivo para impressão de plaquinhas pelo painel.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      O garçom e a cozinha recebem o pedido já com a identificação da mesa.
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Atualização imediata de preços sem precisar reimprimir cardápios de papel.
                    </p>
                  </div>
                </div>

                {/* Exemplo Real de Plaquinha */}
                <div className="bg-slate-950 text-white rounded-3xl p-6 text-center max-w-xs mx-auto w-full shadow-md border-2 border-amber-400 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                    CARDÁPIO DIGITAL NO SALÃO
                  </span>
                  <h4 className="text-2xl font-black font-display">MESA 05</h4>
                  <div className="bg-white p-3 rounded-2xl mx-auto w-36 h-36 flex items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-950" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Aponte a câmera do seu celular para fazer seu pedido
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: TRANSPARÊNCIA FINANCEIRA & CALCULADORA REAL */}
      <section id="comparativo" className="py-14 sm:py-20 max-w-5xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
            Transparência Financeira
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
            Entenda a diferença entre o modelo tradicional e o CARDAPP
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Sem pegadinhas ou taxas ocultas. Veja como funciona o fluxo financeiro de forma transparente.
          </p>
        </div>

        {/* Comparativo Lado a Lado Real */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
            <span className="text-xs font-black uppercase text-red-700 block">
              Marketplaces Tradicionais de Delivery
            </span>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Cobram comissão percentual entre 12% e 27% sobre todas as vendas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>O dinheiro das suas vendas fica retido e só é repassado dias ou semanas depois.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Os dados dos clientes (telefone, nome) não pertencem ao seu restaurante.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3">
            <span className="text-xs font-black uppercase text-emerald-800 block">
              Plataforma Própria CARDAPP Digital
            </span>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Zero comissão por pedido. Você paga apenas a assinatura a partir de R$ 2,00/mês.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>O dinheiro do cliente vai direto para você (na sua chave Pix, maquininha ou dinheiro).</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>O cliente é seu: o contato de WhatsApp fica registrado no seu aparelho.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Calculadora Comparativa */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-900">
                Simule seu faturamento mensal em pedidos diretos:
              </label>
              <span className="text-lg sm:text-2xl font-black text-slate-950 font-display">
                {formatCurrency(monthlySales)}
              </span>
            </div>

            <input
              type="range"
              min="2000"
              max="50000"
              step="1000"
              value={monthlySales}
              onChange={(e) => setMonthlySales(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>R$ 2.000</span>
              <span>R$ 15.000</span>
              <span>R$ 30.000</span>
              <span>R$ 50.000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-[10px] uppercase font-bold text-red-700 block">Comissões de Terceiros (27%)</span>
              <span className="text-lg font-black text-red-600 block mt-0.5">-{formatCurrency(appLoss)}</span>
              <span className="text-[10px] text-red-600">descontado do seu faturamento</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Assinatura CARDAPP</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">A partir de R$ 2,00</span>
              <span className="text-[10px] text-slate-500">mensalidade fixa do sistema</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Valor Economizado</span>
              <span className="text-lg font-black text-emerald-700 block mt-0.5">+{formatCurrency(savedAmount)}</span>
              <span className="text-[10px] text-emerald-700">lucro que fica no seu bolso</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: TODOS OS RECURSOS INCLUSOS (RELAÇÃO CONCRETA DO SISTEMA) */}
      <section id="recursos" className="py-14 sm:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
              Recursos Operacionais
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              Tudo o que está incluído no sistema
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Cada função descrita abaixo existe e está pronta para uso no painel do lojista.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <Utensils className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Cadastro de Produtos e Fotos</h4>
              <p className="text-xs text-slate-600">
                Organize seu cardápio por categorias com fotos, descrições detalhadas e controle de disponibilidade.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Adicionais e Opcionais</h4>
              <p className="text-xs text-slate-600">
                Adicione complementos obrigatórios ou opcionais (com acréscimo de valor ou gratuitos) para cada prato.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Taxas de Entrega por Bairro</h4>
              <p className="text-xs text-slate-600">
                Defina taxas específicas e tempo estimado para cada bairro ou cidade onde seu delivery atende.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <Printer className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Impressão Térmica de Comandas</h4>
              <p className="text-xs text-slate-600">
                Layout de impressão formatado para bobinas térmicas de 58mm e 80mm com 1 clique.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                <QrCode className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">QR Code para Mesas do Salão</h4>
              <p className="text-xs text-slate-600">
                Gere plaquinhas com QR Code numeradas para o cliente pedir direto na mesa sem esperar o garçom.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Painel Financeiro & Faturas</h4>
              <p className="text-xs text-slate-600">
                Acompanhe o total vendido no dia, formas de pagamento utilizadas e histórico de faturas registradas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 5: PLANO E REGRAS COMERCIAIS CONCRETAS */}
      <section id="planos" className="py-14 sm:py-20 max-w-3xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
            Condições Comerciais Transparentes
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
            Plano de Assinatura do Sistema
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Valores reais e justos, sem cobranças adicionais ocultas.
          </p>
        </div>

        <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                Plano Cardápio Digital Pro
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950">
                Acesso Completo a Todos os Recursos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sem divisão de planos limitados. Você tem acesso a todas as ferramentas.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs font-bold text-slate-500 block">Mensalidade</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-600">A partir de</span>
                <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">R$ 2,00</span>
                <span className="text-xs font-bold text-slate-600">/mês</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-1">
                0% de taxas sobre suas vendas
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              O que está incluído no seu plano:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Cardápio responsivo sem limite de pedidos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Integração de pedidos formatados no WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Painel do lojista pelo celular ou computador</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Geração de QR Code para mesas e balcão</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Módulo de impressão térmica para cozinha</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Emissão automática de fatura com comprovante</span>
              </div>
            </div>
          </div>

          {/* Regra de Pagamento e Controle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Controle de Renovação Inteligente:</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              O QR Code Pix para renovação da assinatura só é liberado no painel quando faltarem <strong>5 dias</strong> para o vencimento do seu plano. Isso evita cobranças indevidas ou pagamentos em duplicidade. A cada pagamento confirmado, o comprovante oficial fica gravado no seu histórico.
            </p>
          </div>

          <div className="pt-2">
            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Solicitar Acesso à Minha Loja</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Solicitar Acesso pelo WhatsApp</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 6: PERGUNTAS FREQUENTES (FAQ COM RESPOSTAS REAIS) */}
      <section id="faq" className="py-14 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
              Dúvidas Frequentes
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              Respostas claras para perguntas reais
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Informações objetivas para você decidir com total segurança.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEÇÃO 7: CONTATO OFICIAL E DESENVOLVIMENTO */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Suporte Técnico e Ativação
              </span>
              <h3 className="text-lg sm:text-xl font-black">
                Dúvidas ou precisa de suporte para configurar?
              </h3>
              <p className="text-xs text-slate-300">
                Atendimento direto com a equipe de desenvolvimento da SF TECNOLOGIA.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shrink-0 cursor-pointer transition-all flex items-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar com o Suporte no WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-900 text-xs">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold">
                <ForkKnifeIcon className="w-4 h-4 stroke-[2.4]" />
              </div>
              <span className="font-extrabold text-base text-white font-display">
                CARDAPP <span className="text-amber-400">Digital</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
              <a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
              <a href="#telas" className="hover:text-white transition-colors">Telas</a>
              <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
              <a href="#planos" className="hover:text-white transition-colors">Planos</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Painel do Lojista</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 text-center sm:text-left">
            <p>
              CARDAPP Digital • Desenvolvido por <strong className="text-slate-400">SF TECNOLOGIA</strong> • Todos os direitos reservados.
            </p>
            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center justify-center sm:justify-start gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Atendimento e Suporte Oficial no WhatsApp</span>
            </button>
          </div>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DIRETO PARA O WHATSAPP (SEM EXPOR NÚMERO NA TELA) */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => handleOpenWhatsapp()}
          className="group flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 active:scale-95 cursor-pointer border-2 border-white/30"
          title="Falar diretamente no WhatsApp"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6 fill-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
          <span className="text-xs font-black tracking-wide pr-1 hidden sm:inline-block">
            Falar no WhatsApp
          </span>
        </button>
      </div>
    </div>
  );
};
