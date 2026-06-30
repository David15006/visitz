/* EventStaff — petites aides d'interface (modales, notifications) */
window.EventStaff = window.EventStaff || {};

EventStaff.UI = (function () {
  let modalRoot = null;

  function ensureRoot() {
    if (!modalRoot) {
      modalRoot = document.getElementById('es-modal-root');
    }
    return modalRoot;
  }

  function openModal(innerHtml) {
    const root = ensureRoot();
    root.innerHTML = `
      <div class="es-modal-backdrop">
        <div class="es-modal" role="dialog" aria-modal="true">
          <button type="button" class="es-modal-close" aria-label="Fermer">✕</button>
          <div class="es-modal-body">${innerHtml}</div>
        </div>
      </div>
    `;
    root.hidden = false;
    root.querySelector('.es-modal-close').addEventListener('click', closeModal);
    root.querySelector('.es-modal-backdrop').addEventListener('click', (e) => {
      if (e.target.classList.contains('es-modal-backdrop')) closeModal();
    });
    return root.querySelector('.es-modal-body');
  }

  function closeModal() {
    const root = ensureRoot();
    root.hidden = true;
    root.innerHTML = '';
  }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'es-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  return { openModal, closeModal, toast };
})();
