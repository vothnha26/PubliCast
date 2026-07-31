const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PubliCast API',
      version: '1.0.0',
      description: 'Social media management platform API. Documentation is backfilled incrementally — undocumented routes still work, they simply do not appear here yet.'
    },
    servers: [
      { url: '/api', description: 'v1 (current)' },
      { url: '/api/v2', description: 'v2 (response envelope: { message, data })' }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        V2EnvelopeResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object', nullable: true }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Invalid credentials or request error' },
            errors: { type: 'array', items: { type: 'object' }, nullable: true }
          }
        }
      }
    },
    security: [{ cookieAuth: [] }]
  },
  apis: [
    './src/routes/**/*.js'
  ]
};

module.exports = swaggerJsdoc(options);
