/* EventStaff — vue Export (génère un fichier Excel à partir des check-in/check-out) */
window.EventStaff = window.EventStaff || {};
EventStaff.Views = EventStaff.Views || {};

EventStaff.Views.Export = (function () {
  const Store = EventStaff.Store;
  const Utils = EventStaff.Utils;

  const COLUMNS = ['Nom', 'Prénom', 'Événement', 'Shift', 'Arrivée', 'Départ', 'Heures prestées'];

  function buildRows() {
    const rows = [];
    Store.getShifts().forEach((shift) => {
      const event = Store.getEvent(shift.eventId);
      shift.assignments.forEach((a) => {
        const st = Store.getStudent(a.studentId);
        if (!st) return;
        const duree = Utils.calcDureeHeures(a.checkin, a.checkout);
        rows.push({
          nom: st.nom,
          prenom: st.prenom,
          evenement: event ? event.nom : '',
          shift: shift.nom,
          arrivee: a.checkin.done ? Utils.formatDateShort(a.checkin.date) + ' ' + a.checkin.heure : '',
          depart: a.checkout.done ? Utils.formatDateShort(a.checkout.date) + ' ' + a.checkout.heure : '',
          heures: duree ? duree.label : ''
        });
      });
    });
    return rows;
  }

  function render() {
    const el = document.getElementById('view-export');
    const rows = buildRows();

    el.innerHTML = `
      <div class="es-view-header">
        <h1>Export</h1>
        <button type="button" class="es-btn es-btn-primary" id="es-export-btn" ${rows.length === 0 ? 'disabled' : ''}>Exporter (Excel)</button>
      </div>
      ${rows.length === 0 ? '<p class="es-empty">Aucune donnée à exporter pour le moment.</p>' : `
        <div class="es-table-wrap">
          <table class="es-table">
            <thead><tr>${COLUMNS.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td>${Utils.escapeHtml(r.nom)}</td>
                  <td>${Utils.escapeHtml(r.prenom)}</td>
                  <td>${Utils.escapeHtml(r.evenement)}</td>
                  <td>${Utils.escapeHtml(r.shift)}</td>
                  <td>${Utils.escapeHtml(r.arrivee)}</td>
                  <td>${Utils.escapeHtml(r.depart)}</td>
                  <td>${Utils.escapeHtml(r.heures)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    const btn = el.querySelector('#es-export-btn');
    if (btn) btn.addEventListener('click', () => exportExcel(rows));
  }

  function exportExcel(rows) {
    const headerHtml = COLUMNS.map((c) => `<th>${Utils.escapeHtml(c)}</th>`).join('');
    const bodyHtml = rows.map((r) => `
      <tr>
        <td>${Utils.escapeHtml(r.nom)}</td>
        <td>${Utils.escapeHtml(r.prenom)}</td>
        <td>${Utils.escapeHtml(r.evenement)}</td>
        <td>${Utils.escapeHtml(r.shift)}</td>
        <td>${Utils.escapeHtml(r.arrivee)}</td>
        <td>${Utils.escapeHtml(r.depart)}</td>
        <td>${Utils.escapeHtml(r.heures)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body><table border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`;

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eventstaff_export_' + new Date().toISOString().slice(0, 10) + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { render };
})();
