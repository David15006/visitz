/* EventStaff — vue Étudiants */
window.EventStaff = window.EventStaff || {};
EventStaff.Views = EventStaff.Views || {};

EventStaff.Views.Students = (function () {
  const Store = EventStaff.Store;
  const Utils = EventStaff.Utils;
  const UI = EventStaff.UI;

  let searchTerm = '';

  function render() {
    const el = document.getElementById('view-students');
    el.innerHTML = `
      <div class="es-view-header">
        <h1>Étudiants</h1>
        <button type="button" class="es-btn es-btn-primary" id="es-student-add">+ Ajouter un étudiant</button>
      </div>
      <input type="search" id="es-student-search" class="es-input es-search" placeholder="Rechercher (nom, prénom, email)..." value="${Utils.escapeHtml(searchTerm)}">
      <div id="es-student-list"></div>
    `;

    el.querySelector('#es-student-add').addEventListener('click', () => openForm());
    el.querySelector('#es-student-search').addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderList();
    });

    renderList();
  }

  function renderList() {
    const container = document.getElementById('es-student-list');
    if (!container) return;
    const term = searchTerm.trim().toLowerCase();
    let students = Store.getStudents();
    if (term) {
      students = students.filter((s) =>
        (s.nom + ' ' + s.prenom + ' ' + s.email).toLowerCase().includes(term)
      );
    }
    students.sort((a, b) => a.nom.localeCompare(b.nom));

    if (students.length === 0) {
      container.innerHTML = '<p class="es-empty">Aucun étudiant.</p>';
      return;
    }

    container.innerHTML = `
      <div class="es-card-list">
        ${students.map(studentCard).join('')}
      </div>
    `;

    container.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openForm(Store.getStudent(btn.dataset.edit)))
    );
    container.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (confirm('Supprimer cet étudiant ?')) {
          Store.deleteStudent(btn.dataset.delete);
          renderList();
        }
      })
    );
  }

  function studentCard(s) {
    const competencesActives = Utils.COMPETENCES.filter((c) => s.competences && s.competences[c.key]);
    const tags = competencesActives.map((c) => `<span class="es-tag">${c.label}</span>`).join('');
    const statutClass = s.statut === 'actif' ? 'es-badge-ok' : 'es-badge-muted';
    return `
      <div class="es-card">
        <div class="es-card-main">
          <strong>${Utils.escapeHtml(s.nom)} ${Utils.escapeHtml(s.prenom)}</strong>
          <span class="es-badge ${statutClass}">${s.statut === 'actif' ? 'Actif' : 'Inactif'}</span>
          <div class="es-card-meta">${Utils.escapeHtml(s.telephone)} · ${Utils.escapeHtml(s.email)}</div>
          ${tags ? `<div class="es-tags">${tags}</div>` : ''}
          ${s.commentaires ? `<div class="es-comment">${Utils.escapeHtml(s.commentaires)}</div>` : ''}
        </div>
        <div class="es-card-actions">
          <button type="button" class="es-btn es-btn-small" data-edit="${s.id}">Éditer</button>
          <button type="button" class="es-btn es-btn-small es-btn-danger" data-delete="${s.id}">Supprimer</button>
        </div>
      </div>
    `;
  }

  function openForm(student) {
    const isEdit = !!student;
    const s = student || { nom: '', prenom: '', telephone: '', email: '', competences: Utils.emptyCompetences(), commentaires: '', statut: 'actif' };

    const body = UI.openModal(`
      <h2>${isEdit ? 'Éditer' : 'Ajouter'} un étudiant</h2>
      <form id="es-student-form" class="es-form">
        <label>Nom
          <input type="text" name="nom" class="es-input" required value="${Utils.escapeHtml(s.nom)}">
        </label>
        <label>Prénom
          <input type="text" name="prenom" class="es-input" required value="${Utils.escapeHtml(s.prenom)}">
        </label>
        <label>Téléphone
          <input type="tel" name="telephone" class="es-input" value="${Utils.escapeHtml(s.telephone)}">
        </label>
        <label>Email
          <input type="email" name="email" class="es-input" value="${Utils.escapeHtml(s.email)}">
        </label>
        <fieldset class="es-fieldset">
          <legend>Compétences</legend>
          <div class="es-checkbox-grid">
            ${Utils.COMPETENCES.map((c) => `
              <label class="es-checkbox">
                <input type="checkbox" name="competence_${c.key}" ${s.competences && s.competences[c.key] ? 'checked' : ''}>
                ${c.label}
              </label>
            `).join('')}
          </div>
        </fieldset>
        <label>Commentaires
          <textarea name="commentaires" class="es-input" rows="3">${Utils.escapeHtml(s.commentaires)}</textarea>
        </label>
        <label>Statut
          <select name="statut" class="es-input">
            <option value="actif" ${s.statut === 'actif' ? 'selected' : ''}>Actif</option>
            <option value="inactif" ${s.statut === 'inactif' ? 'selected' : ''}>Inactif</option>
          </select>
        </label>
        <div class="es-form-actions">
          <button type="button" class="es-btn" id="es-student-cancel">Annuler</button>
          <button type="submit" class="es-btn es-btn-primary">Enregistrer</button>
        </div>
      </form>
    `);

    body.querySelector('#es-student-cancel').addEventListener('click', UI.closeModal);
    body.querySelector('#es-student-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const competences = {};
      Utils.COMPETENCES.forEach((c) => { competences[c.key] = fd.get('competence_' + c.key) === 'on'; });
      const payload = {
        nom: fd.get('nom').trim(),
        prenom: fd.get('prenom').trim(),
        telephone: fd.get('telephone').trim(),
        email: fd.get('email').trim(),
        competences,
        commentaires: fd.get('commentaires').trim(),
        statut: fd.get('statut')
      };
      if (isEdit) {
        Store.updateStudent(student.id, payload);
      } else {
        Store.addStudent(payload);
      }
      UI.closeModal();
      renderList();
    });
  }

  return { render };
})();
