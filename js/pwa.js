// Instalação como app (PWA) + botão "Adicionar à tela inicial".
// - Android/Chrome/Edge: usa o evento beforeinstallprompt (instalação 1-clique).
// - iOS Safari: mostra instruções (Compartilhar -> Adicionar à Tela de Início).

let deferredPrompt = null;

const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function el(id) { return document.getElementById(id); }

export function initPWA() {
  // Registra o service worker (offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  const btn = el('install-btn');
  const iosModal = el('ios-install');
  const iosClose = el('ios-install-close');

  // Já está instalado/rodando como app -> esconde o botão
  if (isStandalone) {
    btn?.classList.add('hidden');
    return;
  }

  // Android/desktop: captura o prompt nativo
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn?.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    btn?.classList.add('hidden');
    deferredPrompt = null;
  });

  // No iOS o botão aparece sempre (não há prompt nativo)
  if (isiOS) btn?.classList.remove('hidden');

  btn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.classList.add('hidden');
    } else if (isiOS) {
      iosModal?.classList.remove('hidden');
    } else {
      // Navegador sem suporte a prompt: mostra dica genérica do iOS também
      iosModal?.classList.remove('hidden');
    }
  });

  iosClose?.addEventListener('click', () => iosModal?.classList.add('hidden'));
  iosModal?.addEventListener('click', (e) => {
    if (e.target === iosModal) iosModal.classList.add('hidden');
  });
}
