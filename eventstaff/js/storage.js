/* EventStaff — persistance locale (localStorage) */
window.EventStaff = window.EventStaff || {};

EventStaff.Storage = (function () {
  const KEY = 'eventstaff_data_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('EventStaff: lecture localStorage impossible', e);
      return null;
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('EventStaff: écriture localStorage impossible', e);
    }
  }

  return { load, save };
})();
