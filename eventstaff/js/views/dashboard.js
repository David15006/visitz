/* EventStaff — vue Tableau de bord */
window.EventStaff = window.EventStaff || {};
EventStaff.Views = EventStaff.Views || {};

EventStaff.Views.Dashboard = (function () {
  const Store = EventStaff.Store;

  function render() {
    const el = document.getElementById('view-dashboard');
    const stats = Store.getDashboardStats();

    el.innerHTML = `
      <h1>Tableau de bord</h1>
      <div class="es-stats-grid">
        <div class="es-stat-card">
          <span class="es-stat-value">${stats.totalStudents}</span>
          <span class="es-stat-label">Étudiants</span>
        </div>
        <div class="es-stat-card">
          <span class="es-stat-value">${stats.totalEvents}</span>
          <span class="es-stat-label">Événements</span>
        </div>
        <div class="es-stat-card es-stat-warn">
          <span class="es-stat-value">${stats.incompleteShifts}</span>
          <span class="es-stat-label">Shifts incomplets</span>
        </div>
        <div class="es-stat-card es-stat-ok">
          <span class="es-stat-value">${stats.confirmedStudents}</span>
          <span class="es-stat-label">Étudiants confirmés</span>
        </div>
        <div class="es-stat-card">
          <span class="es-stat-value">${stats.waitingStudents}</span>
          <span class="es-stat-label">Étudiants en attente</span>
        </div>
      </div>
    `;
  }

  return { render };
})();
