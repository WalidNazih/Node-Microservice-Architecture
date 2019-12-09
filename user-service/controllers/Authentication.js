'use strict';

var utils = require('../utils/writer.js');
var Authentication = require('../service/AuthenticationService');

module.exports.loginPOST = function loginPOST (req, res, next) {
  var body;
  req.on('data', (data) => {
    body += data.toString();
  });
  req.on('end', (data) => {
    body = body.replace("undefined", "");
    body = JSON.parse(body);
    Authentication.loginPOST(body)
    .then(function (response) {
      if(response == null) {
        utils.writeJson(res, 'User not found');
      } else {
        res.setHeader('Authorization', response);
        res.send();
      }
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
  })
};
