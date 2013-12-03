'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'btford.socket-io'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/list', {templateUrl: 'partials/list.html', controller: 'ListController'});
  $routeProvider.when('/new', {templateUrl: 'partials/detail.html', controller: 'CreateController'});
  $routeProvider.when('/edit/:userId', {templateUrl: 'partials/detail.html', controller: 'EditController'});
  $routeProvider.otherwise({redirectTo: '/list'});
}]);
