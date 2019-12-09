'use strict';

var utils = require('../utils/writer.js');
var Logs = require('../service/LogsService');

module.exports.getLogs = function getLogs (req, res, next) {
  Logs.getLogs()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
