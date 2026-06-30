/* EventStaff — navigation entre les vues (basé sur le hash de l'URL) */
window.EventStaff = window.EventStaff || {};

EventStaff.Router = (function () {
  const views = {};
  let current = null;
  const params = {};

  function register(name, view) {
    views[name] = view;
  }

  function setParam(key, value) {
    params[key] = value;
  }
  function getParam(key) {
    return params[key];
  }

  function navigate(name) {
    if (!views[name]) return;
    window.location.hash = name;
  }

  function showFromHash() {
    const name = (window.location.hash || '#dashboard').slice(1) || 'dashboard';
    show(name);
  }

  function show(name) {
    if (!views[name]) name = 'dashboard';
    current = name;

    document.querySelectorAll('.es-view').forEach((el) => {
      el.hidden = el.id !== 'view-' + name;
    });
    document.querySelectorAll('.es-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });

    if (typeof views[name].render === 'function') {
      views[name].render();
    }
  }

  function init() {
    window.addEventListener('hashchange', showFromHash);
    document.querySelectorAll('.es-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
    showFromHash();
  }

  return { register, navigate, init, setParam, getParam, refresh: () => show(current) };
})();
