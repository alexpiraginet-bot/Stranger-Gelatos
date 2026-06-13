// Instalação como app (PWA) + botão "Instalar app" na tela inicial.
// - Android/Chrome/Edge: usa o evento beforeinstallprompt (instalação 1-clique).
// - iOS Safari: mostra instruções (Compartilhar -> Adicionar à Tela de Início).
// - Desktop/outros: mostra instruções de instalar pela barra de endereço.

let deferredPrompt = null;

const ua = navigator.userAgent || '';
const isiOS = /iphone|ipad|ipod/i.test(ua) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function el(id) { return document.getElementById(id); }

const STEPS = {
  ios: {
    title: 'INSTALAR NO IPHONE',
    html: '<p>1️⃣ Toque em <strong>Compartilhar</strong> <span style="color:#5fb0ff">⎙</span> na barra do <strong>Safari</strong>.</p>'
      + '<p>2️⃣ Role e toque em <strong>"Adicionar à Tela de Início"</strong>.</p>'
      + '<p>3️⃣ Abra pelo ícone do <strong>BENTÔ</strong>. 🍦</p>',
  },
  android: {
    title: 'INSTALAR NO ANDROID',
    html: '<p>1️⃣ Toque no menu <strong>⋮</strong> do Chrome (canto superior).</p>'
      + '<p>2️⃣ Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>'
      + '<p>3️⃣ Abra pelo ícone do <strong>BENTÔ</strong>. 🍦</p>',
  },
  desktop: {
    title: 'INSTALAR NO COMPUTADOR',
    html: '<p>1️⃣ Clique no ícone de instalar <strong>⊕</strong> na barra de endereço.</p>'
      + '<p>2️⃣ Confirme em <strong>"Instalar"</strong>.</p>'
      + '<p>3️⃣ Abra pelo ícone do <strong>BENTÔ</strong>. 🍦</p>',
  },
};

export function initPWA() {
  // Registra o service worker (offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  const btn = el('install-btn');
  const modal = el('install-help');
  const modalTitle = el('install-help-title');
  const modalSteps = el('install-help-steps');
  const modalClose = el('install-help-close');

  // Já está instalado/rodando como app -> esconde o botão e para por aqui
  if (isStandalone) { btn?.classList.add('hidden'); return; }

  // Rótulo do botão por plataforma
  if (btn) {
    btn.textContent = isiOS ? '📲 INSTALAR NO IPHONE'
      : isAndroid ? '📲 INSTALAR APP (ANDROID)'
        : '📲 INSTALAR APP';
    // No celular mostramos sempre (há sempre um caminho manual);
    // no desktop só aparece quando o navegador confirma que dá p/ instalar.
    if (isiOS || isAndroid) btn.classList.remove('hidden');
  }

  // Android/desktop: captura o prompt nativo (instala em 1 clique)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn?.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    btn?.classList.add('hidden');
    deferredPrompt = null;
  });

  function showHelp() {
    const k = isiOS ? 'ios' : isAndroid ? 'android' : 'desktop';
    if (modalTitle) modalTitle.textContent = STEPS[k].title;
    if (modalSteps) modalSteps.innerHTML = STEPS[k].html;
    modal?.classList.remove('hidden');
  }

  btn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      // instalação nativa (Android/Chrome/Edge)
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') btn.classList.add('hidden');
      else showHelp(); // recusou ou não instalou: mostra o passo a passo
    } else {
      // iOS (sem API) ou Android antes do prompt: instruções manuais
      showHelp();
    }
  });

  modalClose?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}
