const Modal = (() => {
  let activeModal = null;

  function open({ title, content, size = 'md', onClose }) {
    close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); z-index: 1000; display: flex;
      align-items: center; justify-content: center; padding: 20px;
      animation: modalOverlayIn 0.2s ease; backdrop-filter: blur(4px);
    `;

    const sizes = { sm: '480px', md: '640px', lg: '900px', xl: '1100px' };
    const maxW = sizes[size] || sizes.md;

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.style.cssText = `
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); width: 100%; max-width: ${maxW};
      max-height: 90vh; overflow-y: auto; animation: modalContentIn 0.25s ease;
    `;

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border)">
        <h3 style="font-size:1.1rem;font-weight:700">${title}</h3>
        <button class="modal-close-btn" style="background:none;border:none;color:var(--text-muted);font-size:1.3rem;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.2s">${Icons.cross}</button>
      </div>
      <div class="modal-body" style="padding:24px">${content}</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(onClose);
    });

    modal.querySelector('.modal-close-btn').addEventListener('click', () => close(onClose));

    activeModal = { overlay, modal, onClose };
    return modal;
  }

  function close(onClose) {
    if (!activeModal) return;
    const { overlay } = activeModal;
    overlay.style.animation = 'modalOverlayOut 0.2s ease forwards';
    const mc = overlay.querySelector('.modal-content');
    if (mc) mc.style.animation = 'modalContentOut 0.2s ease forwards';

    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
    }, 200);

    if (onClose) onClose();
    else if (activeModal.onClose) activeModal.onClose();
    activeModal = null;
  }

  function confirm({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', type = 'danger' }) {
    return new Promise((resolve) => {
      const content = `
        <p style="margin-bottom:20px;color:var(--text-muted)">${message}</p>
        <div style="display:flex;gap:12px;justify-content:flex-start">
          <button class="btn btn-${type} confirm-yes">${confirmText}</button>
          <button class="btn btn-outline confirm-no">${cancelText}</button>
        </div>
      `;

      const modal = open({ title, content, size: 'sm' });
      modal.querySelector('.confirm-yes').addEventListener('click', () => { close(); resolve(true); });
      modal.querySelector('.confirm-no').addEventListener('click', () => { close(); resolve(false); });
    });
  }

  function show({ title, body, confirmText = 'تأكيد', cancelText = 'إلغاء', onConfirm, size = 'md' }) {
    const content = `
      ${body}
      <div style="display:flex;gap:12px;justify-content:flex-start;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        <button class="btn btn-accent modal-confirm-btn">${confirmText}</button>
        <button class="btn btn-outline modal-cancel-btn">${cancelText}</button>
      </div>
    `;

    const modal = open({ title, content, size });
    modal.querySelector('.modal-confirm-btn').addEventListener('click', () => {
      if (onConfirm) onConfirm();
    });
    modal.querySelector('.modal-cancel-btn').addEventListener('click', () => close());
    return modal;
  }

  return { open, close, confirm, show };
})();
