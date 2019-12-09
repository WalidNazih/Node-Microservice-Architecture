'use strict';
var redis = require('redis');
var uuid = require('uuid/v1');
var redisClient = redis.createClient();
var kafka = require('kafka-node');

/* Creation du client Kafka */
var kafkaClient = new kafka.KafkaClient();

/* Creation du Producer Kafka */
var kafkaProducer = new kafka.HighLevelProducer(kafkaClient);

/* la liste qui contient les utilisateurs dans Redis */
var structure = process.env.USER_STRUCTURE;

/* connection au client Redis */
redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

/* Envoie des messages au Topic Kafka des logs */
function sendMessageKafka (message) {
  /* topic et le message a envoyer */
  var consumerPayloads = [
    {
      topic: process.env.KAFKA_TOPIC,
      messages: message 
    }
  ];
  /* Envoie des messages */
  kafkaProducer.send(consumerPayloads, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });

}

/**
 * Ajouter un utilisateur
 *
 * body User 
 * no response value expected for this operation
 **/
exports.addUser = function(body) {
  return new Promise(function(resolve, reject) {
    /* Generation d'un id unique */
    let id = uuid();
    body.id = id;
    /* Ajout d'un hash qui contient l'utilisateur a Redis */
    redisClient.hmset(id, body, (err, data) => {
      if(err) {
        reject(err);
      }else{
        /* Ajout de l'id du hash a une liste des utilisateurs pour organiser
         * les donnees
         */
        redisClient.lpush(structure, id, (err, data) => {
          if(err){
            reject(err);
          }else{
            sendMessageKafka('User ' + id + ' added successfully');
            resolve(body);
          }
        });
      }
    });
  });
}


/**
 * Supprimer un utilisateur
 *
 * id String 
 * no response value expected for this operation
 **/
exports.deleteUser = function(id) {
  return new Promise(function(resolve, reject) {
    /* On supprime le hash par cle */
    redisClient.del(id, (err, data) => {
      if(err) {
        reject(err);
      }else{
        /* On supprime la cle du hash de la liste */ 
        redisClient.lrem(structure, 1, id, (err, data) => {
          if(err) {
            reject(err);
          }else{
            resolve(data);
          }
        });
      }
    });
  });
}


/**
 * Renvoie tous les utilisateurs
 *
 * no response value expected for this operation
 **/
exports.getAllUsers = function() {
  return new Promise(function(resolve, reject) {
    /* Recuperer la totalite de la liste sereneo-users-v2 definie dans la variable structure
     *  0: indice de debut
     * -1: indice de la fin 
     */
    redisClient.lrange(structure, 0, -1, (err, data) => {
      if (err) {
        reject(err);
      } else {
        /* tableau pour ajouter les utilisateurs recupere */
        let allUsers = [];
        /* la liste contient les cles des utilisateurs
         * on parcoure la liste et a chaque iteration on recupere l'utilisateur
         * a l'aide de hgetall 
         */
        data.forEach((key) => {
          redisClient.hgetall(key, (err, user) => {
            if (err) {
              reject(err);
            } else {
              /* on ajoute l'utilisateur au tableau allUsers */
              allUsers.push(user);
              /* on renvoie le tableau si la boucle est finie */
              if(allUsers.length == data.length) {
                resolve(allUsers);
              }
            }
          });
        });
      }
    });
  });
}


/**
 * Recuperation d'un utilisateur
 *
 * id String 
 * no response value expected for this operation
 **/
exports.getOneUser = function(id) {
  return new Promise(function(resolve, reject) {
    /* on recupere l'utilisateur dont l'id est fournie par le controlleur 
     * comme parametre a la fonction 
     */
    redisClient.hgetall(id, (err, user) => {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  });
}


/**
 * Modifier un utilisateur
 *
 * body User 
 * no response value expected for this operation
 **/
exports.updateUser = function(body) {
  return new Promise(function(resolve, reject) {
    /* Modification de l'utilisateur */
    redisClient.hmset(body.id, body, (err, data) => {
      if(err) {
        reject(err);
      }else{
        resolve(body);
      }
    });
  });
}

