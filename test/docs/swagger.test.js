const fs = require('fs');
const path = require('path');

describe('src/docs/swagger.js — OpenAPI spec generation config', () => {
  const modulePath = path.resolve(__dirname, '..', '..', 'src', 'docs', 'swagger.js');

  test('src/docs/swagger.js file exists', () => {
    expect(fs.existsSync(modulePath)).toBe(true);
  });

  test('is a valid Node.js module that can be required without errors', () => {
    expect(() => require(modulePath)).not.toThrow();
  });

  describe('exported spec object', () => {
    let spec;

    beforeAll(() => {
      spec = require(modulePath);
    });

    test('exports a non-null object', () => {
      expect(spec).toBeDefined();
      expect(typeof spec).toBe('object');
      expect(spec).not.toBeNull();
    });

    test('definition.openapi is set to "3.0.0"', () => {
      expect(spec.openapi).toBe('3.0.0');
    });

    test('definition.info.title is "Book API"', () => {
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('Book API');
    });

    test('definition.info.version is "1.0.0"', () => {
      expect(spec.info.version).toBe('1.0.0');
    });

    test('definition.info.description matches expected text', () => {
      expect(spec.info.description).toBe(
        'A RESTful API for managing a book library with checkout/return functionality'
      );
    });

    test('servers contains one entry with url "/api" and description "API server"', () => {
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0]).toEqual({
        url: '/api',
        description: 'API server',
      });
    });

    test('spec has a paths property (object)', () => {
      expect(spec.paths).toBeDefined();
      expect(typeof spec.paths).toBe('object');
    });

    test('spec is a valid OpenAPI 3.0 structure (validated by swagger-parser)', async () => {
      const SwaggerParser = require('@apidevtools/swagger-parser');
      // swagger-parser.validate will throw if the spec is invalid
      const validated = await SwaggerParser.validate(JSON.parse(JSON.stringify(spec)));
      expect(validated).toBeDefined();
      expect(validated.openapi).toBe('3.0.0');
    });
  });

  describe('source code verification', () => {
    let source;

    beforeAll(() => {
      source = fs.readFileSync(modulePath, 'utf-8');
    });

    test('imports swagger-jsdoc', () => {
      expect(source).toMatch(/require\s*\(\s*['"]swagger-jsdoc['"]\s*\)/);
    });

    test('calls swaggerJsdoc with options', () => {
      expect(source).toMatch(/swaggerJsdoc\s*\(\s*options\s*\)/);
    });

    test('exports via module.exports', () => {
      expect(source).toMatch(/module\.exports\s*=/);
    });

    test('apis glob targets ./src/routes/*.js', () => {
      expect(source).toMatch(/['"]\.\/src\/routes\/\*\.js['"]/);
    });
  });
});
