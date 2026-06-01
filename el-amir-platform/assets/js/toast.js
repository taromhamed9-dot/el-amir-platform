const Toast = (() => {
  let container;

  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed; top: 20px; left: 20px; z-index: 10000;
      display: flex; flex-direction: column; gap: 10px; max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  function show(message, type = 'info', duration = 4000) {
    init();
    const colors = {
      success: { bg: 'rgba(39,174,96,0.95)', icon: Icons.check },
      error: { bg: 'rgba(231,76,60,0.95)', icon: Icons.cross },
      warning: { bg: 'rgba(243,156,18,0.95)', icon: Icons.warning },
      info: { bg: 'rgba(45,106,159,0.95)', icon: Icons.info }
    };
    const style = colors[type] || colors.info;

    const el = document.createElement('div');
    el.style.cssText = `
      background: ${style.bg}; color: #fff; padding: 14px 20px;
      border-radius: 10px; font-size: 0.9rem; display: flex; align-items: center;
      gap: 10px; animation: toastIn 0.3s ease; backdrop-filter: blur(10px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.3); cursor: pointer;
    `;
    el.innerHTML = `<span style="font-size:1.1rem">${style.icon}</span><span>${message}</span>`;
    el.onclick = () => remove(el);

    container.appendChild(el);

    setTimeout(() => remove(el), duration);
  }

  function remove(el) {
    if (!el || !el.parentNode) return;
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }

  function success(msg) { show(msg, 'success'); }
  function error(msg) { show(msg, 'error', 6000); }
  function warning(msg) { show(msg, 'warning'); }
  function info(msg) { show(msg, 'info'); }

  return { show, success, error, warning, info };
})();
