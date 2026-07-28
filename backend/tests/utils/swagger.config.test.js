const swaggerSpec = require('../../src/config/swagger.config');

describe('Swagger/OpenAPI spec', () => {
  it('generates a valid OpenAPI 3.0 document with the expected metadata', () => {
    expect(swaggerSpec.openapi).toBe('3.0.0');
    expect(swaggerSpec.info.title).toBe('PubliCast API');
  });

  it('includes the sample-documented YouTube track and published-videos routes', () => {
    expect(swaggerSpec.paths).toHaveProperty('/social/youtube/track');
    expect(swaggerSpec.paths).toHaveProperty('/social/youtube/published-videos');
    expect(swaggerSpec.paths['/social/youtube/track']).toHaveProperty('post');
    expect(swaggerSpec.paths['/social/youtube/published-videos']).toHaveProperty('get');
  });

  it('does not require every route to be documented (undocumented routes are simply absent)', () => {
    expect(swaggerSpec.paths).not.toHaveProperty('/social/youtube/videos');
  });
});
