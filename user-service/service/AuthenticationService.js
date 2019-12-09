'use strict';
var jwt = require('jsonwebtoken');
var redis = require('redis');
var redisClient = redis.createClient();
var bcrypt = require('bcrypt');

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

var structure = process.env.USER_STRUCTURE;
var secret = process.env.JWT_SECRET;


/**
 * Route d'authentification
 *
 * body User  (optional)
 * no response value expected for this operation
 **/
exports.loginPOST = function(body) {
  return new Promise(function(resolve, reject) {
    /* Recuperation de tous les utilisateurs */
    redisClient.lrange(structure, 0, -1, (err, data) => {
      if (err) {
        reject(err);
      } else {
        data.forEach((key, index) => {
          redisClient.hgetall(key, (err, user) => {
            if (err) {
              reject(err);
            } else {
              /* Verification si l'utilisateur existe dans la base Redis */
              if(user.username == body.username && bcrypt.compareSync(body.password, user.password)) {
                /* Construction du JWT */
                var userJWT = jwt.sign(user, secret);
                /* Envoie du JWT avec le prefix Bearer */
                resolve('Bearer ' + userJWT);
              }
            }
            if (index == data.length - 1) {
              resolve(null);
            }
          });
        });
      }
    });
  });
}

