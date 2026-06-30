/* EventStaff — utilitaires partagés (dates, ids, échappement HTML) */
window.EventStaff = window.EventStaff || {};

EventStaff.Utils = (function () {
  const COMPETENCES = [
    { key: 'bar', label: 'Bar' },
    { key: 'caisse', label: 'Caisse' },
    { key: 'parking', label: 'Parking' },
    { key: 'accueil', label: 'Accueil' },
    { key: 'logistique', label: 'Logistique' },
    { key: 'cuisine', label: 'Cuisine' },
    { key: 'vip', label: 'VIP' },
    { key: 'autre', label: 'Autre' }
  ];

  const REPONSE_LABELS = {
    en_attente: 'En attente',
    accepte: 'Accepté',
    refuse: 'Refusé'
  };

  function genId(prefix) {
    return (prefix ? prefix + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function emptyCompetences() {
    const c = {};
    COMPETENCES.forEach((comp) => { c[comp.key] = false; });
    return c;
  }

  function formatDateFr(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDateShort(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  }

  function formatHeure(hhmm) {
    if (!hhmm) return '';
    return hhmm.replace(':', 'h');
  }

  function nowDateHeure() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const heure = now.toTimeString().slice(0, 5);
    return { date, heure };
  }

  function calcDureeHeures(checkin, checkout) {
    if (!checkin || !checkout || !checkin.done || !checkout.done) return null;
    const start = new Date(checkin.date + 'T' + checkin.heure + ':00');
    let end = new Date(checkout.date + 'T' + checkout.heure + ':00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const totalMinutes = Math.round((end - start) / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return { totalMinutes, label: h + 'h' + String(m).padStart(2, '0'), decimal: +(totalMinutes / 60).toFixed(2) };
  }

  return {
    COMPETENCES,
    REPONSE_LABELS,
    genId,
    escapeHtml,
    emptyCompetences,
    formatDateFr,
    formatDateShort,
    formatHeure,
    nowDateHeure,
    calcDureeHeures
  };
})();
