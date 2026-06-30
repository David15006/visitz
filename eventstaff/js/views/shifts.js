/* EventStaff — vue Shifts (création, affectations, invitations SMS, réponses, check-in/out) */
window.EventStaff = window.EventStaff || {};
EventStaff.Views = EventStaff.Views || {};

EventStaff.Views.Shifts = (function () {
  const Store = EventStaff.Store;
  const Utils = EventStaff.Utils;
  const UI = EventStaff.UI;
  const Sms = EventStaff.Sms;
  const Router = EventStaff.Router;

  let selectedEventId = null;

  function render() {
    const el = document.getElementById('view-shifts');
    const events = Store.getEvents();

    const paramEventId = Router.getParam('eventId');
    if (paramEventId) {
      selectedEventId = paramEventId;
      Router.setParam('eventId', null);
    }
    if (selectedEventId && !Store.getEvent(selectedEventId)) selectedEventId = null;
    if (!selectedEventId && events.length > 0) selectedEventId = events[0].id;

    el.innerHTML = `
      <div class="es-view-header">
        <h1>Shifts</h1>
        <button type="button" class="es-btn es-btn-primary" id="es-shift-add" ${events.length === 0 ? 'disabled' : ''}>+ Créer un shift</button>
      </div>
      ${events.length === 0 ? '<p class="es-empty">Créez d\'abord un événement.</p>' : `
        <label class="es-inline-label">Événement
          <select id="es-shift-event-filter" class="es-input">
            ${events.map((e) => `<option value="${e.id}" ${e.id === selectedEventId ? 'selected' : ''}>${Utils.escapeHtml(e.nom)} — ${Utils.formatDateShort(e.date)}</option>`).join('')}
          </select>
        </label>
        <div id="es-shift-list"></div>
      `}
    `;

    if (events.length === 0) return;

    el.querySelector('#es-shift-event-filter').addEventListener('change', (e) => {
      selectedEventId = e.target.value;
      renderList();
    });
    el.querySelector('#es-shift-add').addEventListener('click', () => openShiftForm());

    renderList();
  }

  function renderList() {
    const container = document.getElementById('es-shift-list');
    if (!container) return;
    const shifts = Store.getShifts(selectedEventId);

    if (shifts.length === 0) {
      container.innerHTML = '<p class="es-empty">Aucun shift pour cet événement.</p>';
      return;
    }

    container.innerHTML = `<div class="es-card-list">${shifts.map(shiftCard).join('')}</div>`;

    container.querySelectorAll('[data-open]').forEach((btn) =>
      btn.addEventListener('click', () => openShiftDetail(btn.dataset.open))
    );
  }

  function shiftCard(shift) {
    const stats = Store.getShiftStats(shift);
    return `
      <div class="es-card es-card-clickable" data-open="${shift.id}">
        <div class="es-card-main">
          <strong>${Utils.escapeHtml(shift.nom)}</strong>
          <span class="es-badge ${stats.complet ? 'es-badge-ok' : 'es-badge-warn'}">${stats.complet ? 'Complet' : 'Incomplet'}</span>
          <div class="es-card-meta">${Utils.formatHeure(shift.heureDebut)}-${Utils.formatHeure(shift.heureFin)}</div>
          <div class="es-card-meta">${stats.inscrits} inscrit(s) · ${stats.placesRestantes} place(s) restante(s) sur ${shift.nbPersonnes}</div>
        </div>
      </div>
    `;
  }

  function openShiftForm(shift) {
    const isEdit = !!shift;
    const s = shift || { nom: '', heureDebut: '', heureFin: '', nbPersonnes: 1 };

    const body = UI.openModal(`
      <h2>${isEdit ? 'Éditer' : 'Créer'} un shift</h2>
      <form id="es-shift-form" class="es-form">
        <label>Nom
          <input type="text" name="nom" class="es-input" required value="${Utils.escapeHtml(s.nom)}">
        </label>
        <label>Heure début
          <input type="time" name="heureDebut" class="es-input" required value="${Utils.escapeHtml(s.heureDebut)}">
        </label>
        <label>Heure fin
          <input type="time" name="heureFin" class="es-input" required value="${Utils.escapeHtml(s.heureFin)}">
        </label>
        <label>Nombre de personnes nécessaires
          <input type="number" name="nbPersonnes" class="es-input" min="1" required value="${s.nbPersonnes}">
        </label>
        <div class="es-form-actions">
          <button type="button" class="es-btn" id="es-shift-cancel">Annuler</button>
          <button type="submit" class="es-btn es-btn-primary">Enregistrer</button>
        </div>
      </form>
    `);

    body.querySelector('#es-shift-cancel').addEventListener('click', UI.closeModal);
    body.querySelector('#es-shift-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        nom: fd.get('nom').trim(),
        heureDebut: fd.get('heureDebut'),
        heureFin: fd.get('heureFin'),
        nbPersonnes: Number(fd.get('nbPersonnes'))
      };
      if (isEdit) {
        Store.updateShift(shift.id, payload);
      } else {
        payload.eventId = selectedEventId;
        Store.addShift(payload);
      }
      UI.closeModal();
      renderList();
    });
  }

  function reponseLabel(statut) {
    return Utils.REPONSE_LABELS[statut] || statut;
  }

  function openShiftDetail(shiftId) {
    let showAssocier = false;
    let showInviter = false;
    let lastSmsText = '';

    function paint() {
      const shift = Store.getShift(shiftId);
      if (!shift) { UI.closeModal(); renderList(); return; }
      const event = Store.getEvent(shift.eventId);
      const stats = Store.getShiftStats(shift);
      const assignedIds = new Set(shift.assignments.map((a) => a.studentId));
      const availableStudents = Store.getStudents().filter((st) => st.statut === 'actif' && !assignedIds.has(st.id));

      const body = UI.openModal(`
        <h2>${Utils.escapeHtml(shift.nom)}</h2>
        <p class="es-card-meta">${Utils.escapeHtml(event ? event.nom : '')} · ${Utils.formatHeure(shift.heureDebut)}-${Utils.formatHeure(shift.heureFin)}</p>
        <p class="es-card-meta">${stats.inscrits} inscrit(s) · ${stats.placesRestantes} place(s) restante(s) sur ${shift.nbPersonnes}</p>

        <div class="es-form-actions">
          <button type="button" class="es-btn es-btn-small" id="es-shift-edit">Éditer le shift</button>
          <button type="button" class="es-btn es-btn-small es-btn-danger" id="es-shift-delete">Supprimer le shift</button>
        </div>

        <h3>Étudiants assignés</h3>
        ${shift.assignments.length === 0 ? '<p class="es-empty">Aucun étudiant assigné.</p>' : `
          <div class="es-assign-list">
            ${shift.assignments.map((a) => assignmentRow(a, event)).join('')}
          </div>
        `}

        <div class="es-form-actions">
          <button type="button" class="es-btn es-btn-small" id="es-toggle-associer">${showAssocier ? 'Fermer' : '+ Associer un étudiant'}</button>
          <button type="button" class="es-btn es-btn-small" id="es-toggle-inviter" ${shift.assignments.length === 0 ? 'disabled' : ''}>${showInviter ? 'Fermer' : 'Inviter par SMS'}</button>
        </div>

        ${showAssocier ? `
          <form id="es-associer-form" class="es-form">
            ${availableStudents.length === 0 ? '<p class="es-empty">Aucun étudiant actif disponible.</p>' : `
              <div class="es-checkbox-grid">
                ${availableStudents.map((st) => `
                  <label class="es-checkbox">
                    <input type="checkbox" name="student" value="${st.id}">
                    ${Utils.escapeHtml(st.nom)} ${Utils.escapeHtml(st.prenom)}
                  </label>
                `).join('')}
              </div>
              <div class="es-form-actions">
                <button type="submit" class="es-btn es-btn-primary es-btn-small">Ajouter au shift</button>
              </div>
            `}
          </form>
        ` : ''}

        ${showInviter ? `
          <div class="es-form" id="es-inviter-panel">
            <div class="es-checkbox-grid">
              ${shift.assignments.map((a) => {
                const st = Store.getStudent(a.studentId);
                if (!st) return '';
                return `
                  <label class="es-checkbox">
                    <input type="checkbox" name="invite" value="${st.id}">
                    ${Utils.escapeHtml(st.nom)} ${Utils.escapeHtml(st.prenom)}
                  </label>
                `;
              }).join('')}
            </div>
            <div class="es-form-actions">
              <button type="button" class="es-btn es-btn-small es-btn-primary" id="es-generate-sms">Générer le SMS</button>
            </div>
            <div id="es-sms-output"></div>
          </div>
        ` : ''}
      `);

      body.querySelector('#es-shift-edit').addEventListener('click', () => openShiftForm(shift));
      body.querySelector('#es-shift-delete').addEventListener('click', () => {
        if (confirm('Supprimer ce shift ?')) {
          Store.deleteShift(shift.id);
          UI.closeModal();
          renderList();
        }
      });

      body.querySelectorAll('[data-status]').forEach((btn) =>
        btn.addEventListener('click', () => {
          Store.setAssignmentStatus(shift.id, btn.dataset.studentId, btn.dataset.status);
          paint();
        })
      );
      body.querySelectorAll('[data-checkin]').forEach((btn) =>
        btn.addEventListener('click', () => {
          Store.setCheckin(shift.id, btn.dataset.checkin);
          paint();
        })
      );
      body.querySelectorAll('[data-checkout]').forEach((btn) =>
        btn.addEventListener('click', () => {
          Store.setCheckout(shift.id, btn.dataset.checkout);
          paint();
        })
      );
      body.querySelectorAll('[data-onss]').forEach((btn) =>
        btn.addEventListener('click', () => {
          if (event && event.checkinUrl) window.open(event.checkinUrl, '_blank', 'noopener');
        })
      );
      body.querySelectorAll('[data-remove]').forEach((btn) =>
        btn.addEventListener('click', () => {
          if (confirm('Retirer cet étudiant du shift ?')) {
            Store.removeAssignment(shift.id, btn.dataset.remove);
            paint();
          }
        })
      );

      const toggleAssocier = body.querySelector('#es-toggle-associer');
      if (toggleAssocier) toggleAssocier.addEventListener('click', () => { showAssocier = !showAssocier; paint(); });
      const toggleInviter = body.querySelector('#es-toggle-inviter');
      if (toggleInviter) toggleInviter.addEventListener('click', () => { showInviter = !showInviter; paint(); });

      const associerForm = body.querySelector('#es-associer-form');
      if (associerForm) associerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ids = new FormData(e.target).getAll('student');
        if (ids.length > 0) Store.assignStudents(shift.id, ids);
        showAssocier = false;
        paint();
      });

      const generateBtn = body.querySelector('#es-generate-sms');
      if (generateBtn) generateBtn.addEventListener('click', () => {
        if (!event) return;
        lastSmsText = Sms.buildInvitationMessage(event, shift);
        const out = body.querySelector('#es-sms-output');
        out.innerHTML = `
          <textarea id="es-sms-text" class="es-input" rows="6" readonly>${Utils.escapeHtml(lastSmsText)}</textarea>
          <div class="es-form-actions">
            <button type="button" class="es-btn es-btn-small es-btn-primary" id="es-sms-copy">Copier le message</button>
          </div>
        `;
        out.querySelector('#es-sms-copy').addEventListener('click', async () => {
          const ok = await Sms.copyToClipboard(lastSmsText);
          UI.toast(ok ? 'Message copié.' : 'Copie impossible, sélectionnez le texte manuellement.');
        });
      });
    }

    paint();
  }

  function assignmentRow(a, event) {
    const st = Store.getStudent(a.studentId);
    if (!st) return '';
    const duree = Utils.calcDureeHeures(a.checkin, a.checkout);
    const statutClass = { en_attente: 'es-badge-muted', accepte: 'es-badge-ok', refuse: 'es-badge-danger' }[a.statut] || '';
    return `
      <div class="es-assign-row">
        <div class="es-assign-name">
          <strong>${Utils.escapeHtml(st.nom)} ${Utils.escapeHtml(st.prenom)}</strong>
          <span class="es-badge ${statutClass}">${reponseLabel(a.statut)}</span>
        </div>
        <div class="es-assign-actions">
          <button type="button" class="es-btn es-btn-tiny" data-status="accepte" data-student-id="${st.id}">✓ Accepter</button>
          <button type="button" class="es-btn es-btn-tiny" data-status="refuse" data-student-id="${st.id}">✕ Refuser</button>
          <button type="button" class="es-btn es-btn-tiny" data-status="en_attente" data-student-id="${st.id}">⏳ Attente</button>
        </div>
        <div class="es-assign-actions">
          <button type="button" class="es-btn es-btn-tiny" data-onss="${st.id}" ${event && event.checkinUrl ? '' : 'disabled'}>CHECK-IN ONSS</button>
          <button type="button" class="es-btn es-btn-tiny" data-checkin="${st.id}" ${a.checkin.done ? 'disabled' : ''}>${a.checkin.done ? '✔ Check-in effectué (' + a.checkin.heure + ')' : 'Check-in'}</button>
          <button type="button" class="es-btn es-btn-tiny" data-checkout="${st.id}" ${!a.checkin.done || a.checkout.done ? 'disabled' : ''}>${a.checkout.done ? '✔ Check-out effectué (' + a.checkout.heure + ')' : 'Check-out'}</button>
          <button type="button" class="es-btn es-btn-tiny es-btn-danger" data-remove="${st.id}">Retirer</button>
        </div>
        ${duree ? `<div class="es-card-meta">Heures prestées : ${duree.label}</div>` : ''}
      </div>
    `;
  }

  return { render };
})();
