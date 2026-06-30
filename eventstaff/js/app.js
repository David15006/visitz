/* EventStaff — point d'entrée de l'application */
(function () {
  EventStaff.Store.init();

  EventStaff.Router.register('dashboard', EventStaff.Views.Dashboard);
  EventStaff.Router.register('students', EventStaff.Views.Students);
  EventStaff.Router.register('events', EventStaff.Views.Events);
  EventStaff.Router.register('shifts', EventStaff.Views.Shifts);
  EventStaff.Router.register('export', EventStaff.Views.Export);

  EventStaff.Router.init();
})();
