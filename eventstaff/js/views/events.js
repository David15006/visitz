/* EventStaff — vue Événements */
window.EventStaff = window.EventStaff || {};
EventStaff.Views = EventStaff.Views || {};

EventStaff.Views.Events = (function () {
  const Store = EventStaff.Store;
  const Utils = EventStaff.Utils;
  const UI = EventStaff.UI;
  const Router = EventStaff.Router;

  function render() {
    const el = document.getElementById('view-events');
    el.innerHTML = `
      <div class="es-view-header">
        <h1>Événements</h1>
        <button type="button" class="es-btn es-btn-primary" id="es-event-add">+ Créer un événement</button>
      </div>
      <div id="es-event-list"></div>
    `;
    el.querySelector('#es-event-add').addEventListener('click', () => openForm());
    renderList();
  }

  function renderList() {
    const container = document.getElementById('es-event-list');
    if (!container) return;
    const events = Store.getEvents().slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (events.length === 0) {
      container.innerHTML = '<p class="es-empty">Aucun événement.</p>';
      return;
    }

    container.innerHTML = `<div class="es-card-list">${events.map(eventCard).join('')}</div>`;

    container.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openForm(Store.getEvent(btn.dataset.edit)))
    );
    container.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (confirm('Supprimer cet événement et tous ses shifts ?')) {
          Store.deleteEvent(btn.dataset.delete);
          renderList();
        }
      })
    );
    container.querySelectorAll('[data-shifts]').forEach((btn) =>
      btn.addEventListener('click', () => {
        Router.setParam('eventId', btn.dataset.shifts);
        Router.navigate('shifts');
      })
    );
  }

  function eventCard(e) {
    const shiftsCount = Store.getShifts(e.id).length;
    return `
      <div class="es-card">
        <div class="es-card-main">
          <strong>${Utils.escapeHtml(e.nom)}</strong>
          <div class="es-card-meta">${Utils.escapeHtml(e.lieu)} · ${Utils.formatDateShort(e.date)} ${Utils.escapeHtml(e.heure)}</div>
          ${e.description ? `<div class="es-comment">${Utils.escapeHtml(e.description)}</div>` : ''}
          <div class="es-card-meta">${shiftsCount} shift(s)${e.checkinUrl ? ' · lien check-in ONSS défini' : ''}</div>
        </div>
        <div class="es-card-actions">
          <button type="button" class="es-btn es-btn-small" data-shifts="${e.id}">Shifts</button>
          <button type="button" class="es-btn es-btn-small" data-edit="${e.id}">Éditer</button>
          <button type="button" class="es-btn es-btn-small es-btn-danger" data-delete="${e.id}">Supprimer</button>
        </div>
      </div>
    `;
  }

  function openForm(event) {
    const isEdit = !!event;
    const e = event || { nom: '', lieu: '', date: '', heure: '', description: '', checkinUrl: '' };

    const body = UI.openModal(`
      <h2>${isEdit ? 'Éditer' : 'Créer'} un événement</h2>
      <form id="es-event-form" class="es-form">
        <label>Nom
          <input type="text" name="nom" class="es-input" required value="${Utils.escapeHtml(e.nom)}">
        </label>
        <label>Lieu
          <input type="text" name="lieu" class="es-input" value="${Utils.escapeHtml(e.lieu)}">
        </label>
        <label>Date
          <input type="date" name="date" class="es-input" required value="${Utils.escapeHtml(e.date)}">
        </label>
        <label>Heure
          <input type="time" name="heure" class="es-input" value="${Utils.escapeHtml(e.heure)}">
        </label>
        <label>Description
          <textarea name="description" class="es-input" rows="3">${Utils.escapeHtml(e.description)}</textarea>
        </label>
        <label>Lien Check-in ONSS
          <input type="url" name="checkinUrl" class="es-input" placeholder="https://..." value="${Utils.escapeHtml(e.checkinUrl)}">
        </label>
        <div class="es-form-actions">
          <button type="button" class="es-btn" id="es-event-cancel">Annuler</button>
          <button type="submit" class="es-btn es-btn-primary">Enregistrer</button>
        </div>
      </form>
    `);

    body.querySelector('#es-event-cancel').addEventListener('click', UI.closeModal);
    body.querySelector('#es-event-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const payload = {
        nom: fd.get('nom').trim(),
        lieu: fd.get('lieu').trim(),
        date: fd.get('date'),
        heure: fd.get('heure'),
        description: fd.get('description').trim(),
        checkinUrl: fd.get('checkinUrl').trim()
      };
      if (isEdit) {
        Store.updateEvent(event.id, payload);
      } else {
        Store.addEvent(payload);
      }
      UI.closeModal();
      renderList();
    });
  }

  return { render };
})();
