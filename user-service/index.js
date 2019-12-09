'use strict';

var fs = require('fs'),
    path = require('path'),
    http = require('http');

var app = require('connect')();
var oas3Tools = require('oas3-tools');
var jsyaml = require('js-yaml');
var uuid = require('uuid/v1');
var consul = require('consul')();
var dotenv = require('dotenv');
dotenv.config();

var serverPort = parseInt(process.env.PORT);

/* Options de consul pour l'enregistrement de l'application */
var consulOptions = {
  id: uuid(),
  name: process.env.SERVICE_NAME,
  port: serverPort,
  address: 'localhost'
};

/* L'enregistrement de l'application dans Consul */
consul.agent.service.register(consulOptions, (err) => {
  if(err) {
    console.log(err);
  }else{
    console.log('Registered Successfully');
  }
});

// swaggerRouter configuration
var options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname,'api/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

// Initialize the Swagger middleware
oas3Tools.initializeMiddleware(swaggerDoc, function (middleware) {

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
