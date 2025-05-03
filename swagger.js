const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

/**
 * Configure Swagger UI for Express application
 * @param {Object} app - Express application instance
 */
const setupSwaggerUI = (app) => {
  // Load Swagger YAML file
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
  
  // Set up Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none'
    }
  }));
  
  console.log('Swagger UI available at /api-docs');
};

module.exports = setupSwaggerUI;