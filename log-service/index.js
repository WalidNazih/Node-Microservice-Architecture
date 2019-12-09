'use strict';

var fs = require('fs'),
    path = require('path'),
    http = require('http');

var app = require('connect')();
var oas3Tools = require('oas3-tools');
var jsyaml = require('js-yaml');
var jwt = require('jsonwebtoken');
var uuid = require('uuid');
var dotenv = require('dotenv');
dotenv.config();

var consul = require('consul')();

var serverPort = parseInt(process.env.PORT);
/* Options de consul pour l'enregistrement de l'application */
var consulOptions = {
  id: uuid(),
  name: process.env.SERVICE_NAME,
  port: serverPort,
  address: 'localhost'
}

/* L'enregistrement de l'application dans Consul */
consul.agent.service.register(consulOptions, (err) => {
  if(err){
    console.log(err);
  }
});

/* Secret de JWT */
var secret = process.env.JWT_SECRET;

// swaggerRouter configuration
var options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname,'api/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

/* Middleware pour la verification de validite du JWT avant toute execution de requete */
var verifyJWT = (req, res, next) => {
  /* Recuperation du JWT depuis le header authorization */
  var token = req.headers.authorization;
  /* Si le header ne contient pas le token on envoie une erreur 403  */
  if(token == null) {
    res.statusCode = 403;
    res.end('No permission to access the data');
  }
  else {
    /* Si le token commence par Bearer on supprime le prefix et on verifie
     * jwt.verify permet de verifier le token et renvoie le contenu du token
    */
    if(token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
      var user = jwt.verify(token, secret);
      /* si le token est valide on lance la requete avec next */
      if(user) {
        next();
      } else {
        /* Sinon on renvoie code d'erreur 403 */
        res.statusCode = 403;
        res.end('No permission to access the data');
      }
    }else {
      /* Si le token ne commence pas par Bearer ce n'est pas valide
       * on renvoie le code 403
      */
      res.statusCode = 403;
      res.end('No permission to access the data');
    }
  } 

};

// Initialize the Swagger middleware
oas3Tools.initializeMiddleware(swaggerDoc, function (middleware) {

  /* Integration de la verification dans l'application */
  app.use(verifyJWT);
  // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
  app.use(middleware.swaggerMetadata());

  // Validate Swagger requests
  app.use(middleware.swaggerValidator());

  // Route validated requests to appropriate controller
  app.use(middleware.swaggerRouter(options));

  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi());

  // Start the server
  http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
  });

});
