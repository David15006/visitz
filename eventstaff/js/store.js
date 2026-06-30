/* EventStaff — couche de données (CRUD étudiants / événements / shifts) */
window.EventStaff = window.EventStaff || {};

EventStaff.Store = (function () {
  const Utils = EventStaff.Utils;
  const Storage = EventStaff.Storage;

  let data = { students: [], events: [], shifts: [] };

  function init() {
    const loaded = Storage.load();
    if (loaded) {
      data = Object.assign({ students: [], events: [], shifts: [] }, loaded);
    }
  }

  function persist() {
    Storage.save(data);
  }

  /* ---------- Étudiants ---------- */
  function getStudents() {
    return data.students.slice();
  }
  function getStudent(id) {
    return data.students.find((s) => s.id === id) || null;
  }
  function addStudent(student) {
    const s = {
      id: Utils.genId('etu'),
      nom: student.nom || '',
      prenom: student.prenom || '',
      telephone: student.telephone || '',
      email: student.email || '',
      competences: student.competences || Utils.emptyCompetences(),
      commentaires: student.commentaires || '',
      statut: student.statut || 'actif'
    };
    data.students.push(s);
    persist();
    return s;
  }
  function updateStudent(id, changes) {
    const s = getStudent(id);
    if (!s) return null;
    Object.assign(s, changes);
    persist();
    return s;
  }
  function deleteStudent(id) {
    data.students = data.students.filter((s) => s.id !== id);
    data.shifts.forEach((sh) => {
      sh.assignments = sh.assignments.filter((a) => a.studentId !== id);
    });
    persist();
  }

  /* ---------- Événements ---------- */
  function getEvents() {
    return data.events.slice();
  }
  function getEvent(id) {
    return data.events.find((e) => e.id === id) || null;
  }
  function addEvent(evt) {
    const e = {
      id: Utils.genId('evt'),
      nom: evt.nom || '',
      lieu: evt.lieu || '',
      date: evt.date || '',
      heure: evt.heure || '',
      description: evt.description || '',
      checkinUrl: evt.checkinUrl || ''
    };
    data.events.push(e);
    persist();
    return e;
  }
  function updateEvent(id, changes) {
    const e = getEvent(id);
    if (!e) return null;
    Object.assign(e, changes);
    persist();
    return e;
  }
  function deleteEvent(id) {
    data.events = data.events.filter((e) => e.id !== id);
    data.shifts = data.shifts.filter((sh) => sh.eventId !== id);
    persist();
  }

  /* ---------- Shifts ---------- */
  function getShifts(eventId) {
    const list = eventId ? data.shifts.filter((s) => s.eventId === eventId) : data.shifts.slice();
    return list;
  }
  function getShift(id) {
    return data.shifts.find((s) => s.id === id) || null;
  }
  function addShift(shift) {
    const s = {
      id: Utils.genId('shf'),
      eventId: shift.eventId,
      nom: shift.nom || '',
      heureDebut: shift.heureDebut || '',
      heureFin: shift.heureFin || '',
      nbPersonnes: Number(shift.nbPersonnes) || 0,
      assignments: []
    };
    data.shifts.push(s);
    persist();
    return s;
  }
  function updateShift(id, changes) {
    const s = getShift(id);
    if (!s) return null;
    Object.assign(s, changes);
    persist();
    return s;
  }
  function deleteShift(id) {
    data.shifts = data.shifts.filter((s) => s.id !== id);
    persist();
  }

  function getShiftStats(shift) {
    const inscrits = shift.assignments.filter((a) => a.statut !== 'refuse').length;
    const placesRestantes = Math.max(0, shift.nbPersonnes - inscrits);
    const complet = inscrits >= shift.nbPersonnes;
    return { inscrits, placesRestantes, complet };
  }

  /* ---------- Affectations (étudiant <-> shift) ---------- */
  function assignStudents(shiftId, studentIds) {
    const shift = getShift(shiftId);
    if (!shift) return;
    studentIds.forEach((studentId) => {
      if (!shift.assignments.some((a) => a.studentId === studentId)) {
        shift.assignments.push({
          studentId,
          statut: 'en_attente',
          checkin: { done: false, date: null, heure: null },
          checkout: { done: false, date: null, heure: null }
        });
      }
    });
    persist();
  }

  function removeAssignment(shiftId, studentId) {
    const shift = getShift(shiftId);
    if (!shift) return;
    shift.assignments = shift.assignments.filter((a) => a.studentId !== studentId);
    persist();
  }

  function setAssignmentStatus(shiftId, studentId, statut) {
    const shift = getShift(shiftId);
    if (!shift) return;
    const a = shift.assignments.find((x) => x.studentId === studentId);
    if (!a) return;
    a.statut = statut;
    persist();
  }

  function setCheckin(shiftId, studentId) {
    const shift = getShift(shiftId);
    if (!shift) return;
    const a = shift.assignments.find((x) => x.studentId === studentId);
    if (!a) return;
    const { date, heure } = Utils.nowDateHeure();
    a.checkin = { done: true, date, heure };
    persist();
  }

  function setCheckout(shiftId, studentId) {
    const shift = getShift(shiftId);
    if (!shift) return;
    const a = shift.assignments.find((x) => x.studentId === studentId);
    if (!a) return;
    const { date, heure } = Utils.nowDateHeure();
    a.checkout = { done: true, date, heure };
    persist();
  }

  /* ---------- Tableau de bord ---------- */
  function getDashboardStats() {
    const totalStudents = data.students.length;
    const totalEvents = data.events.length;
    const incompleteShifts = data.shifts.filter((sh) => !getShiftStats(sh).complet).length;

    const confirmedSet = new Set();
    const waitingSet = new Set();
    data.shifts.forEach((sh) => {
      sh.assignments.forEach((a) => {
        if (a.statut === 'accepte') confirmedSet.add(a.studentId);
        if (a.statut === 'en_attente') waitingSet.add(a.studentId);
      });
    });

    return {
      totalStudents,
      totalEvents,
      incompleteShifts,
      confirmedStudents: confirmedSet.size,
      waitingStudents: waitingSet.size
    };
  }

  return {
    init,
    getStudents, getStudent, addStudent, updateStudent, deleteStudent,
    getEvents, getEvent, addEvent, updateEvent, deleteEvent,
    getShifts, getShift, addShift, updateShift, deleteShift, getShiftStats,
    assignStudents, removeAssignment, setAssignmentStatus, setCheckin, setCheckout,
    getDashboardStats
  };
})();
