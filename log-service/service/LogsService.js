'use strict';

var redis = require('redis');
var uuid = require('uuid');
var kafka = require('kafka-node');

/* Nom de la liste qui contient les logs 
 * nom est definie dans le fichier .env
*/
var structure = process.env.LOG_STRUCTURE;

/* Creation du client Redis */
var redisClient = redis.createClient();

/* Topic Kafka qui contient les messages des logs */
var kafkaTopics = [
  {
    topic: process.env.KAFKA_TOPIC,
    partition: 0
  }
];

/* Commit automatique de l'offset des messages apres 5 seconds  */
var kafkaOptions = {
  autoCommit: true
};

/* Creation du client Kafka */
var kafkaClient = new kafka.KafkaClient();

/* Creation du Consumer pour recevoir les messages */
var kafkaConsumer = new kafka.Consumer(kafkaClient, kafkaTopics, kafkaOptions);

/* Ajout d'un log lorqu'on recoie le message du log */
kafkaConsumer.on('message', (message) => {
  var log = {
    message: message.value
  };

  this.addLog(log).then(() => {
    console.log(log);
  }).catch((err) => {
    console.log(err);
  });
}); 
/**
 *
 * no response value expected for this operation
 **/
exports.getLogs = function() {
  return new Promise(function(resolve, reject) {
    /* Recuperation des cles des hashes */
    redisClient.lrange(structure, 0, -1, (err, data) => {
      if (err) {
        reject(err);
      } else {
        /* Tableau qui contient tous les logs */
        var allLogs = [];
        /* Parcours de la liste des cles */
        data.forEach(key => {
          /* Pour chaque cle on recupere le log depuis la liste Redis */
          redisClient.hgetall(key, (err, log) => {
            if(err) {
              reject(err);
            } else {
              /* Ajout du log a la liste des logs */
              allLogs.push(log);
              if (allLogs.length == data.length){
                /* Envoie des logs au controlleur */
                resolve(allLogs);
              }
            }
          });
        });
      }
    });
  });
}

/* Ajout du log 
 * Le parametre log contient le log recu par consumer de Kafka
*/
exports.addLog = (log) => {
  /* Generation d'un id unique */
  var id = uuid();
  /* Affectation de l'id au log */
  log.id = id;

  return new Promise((resolve, reject) => {
    /* Creation du hash de log dans Redis */
    redisClient.hmset(id, log, (err, data) => {
      if (err) {
        reject(err);
      } else {
        /* Ajout du cle de hash dans une liste Redis */
        redisClient.lpush(structure, id, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
};

