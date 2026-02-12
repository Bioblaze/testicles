const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');

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

describe('Swagger spec validation (Issue #182)', () => {
  const swaggerSpec = require('../../src/docs/swagger');
  const app = require('../../src/app');

  /**
   * Helper: extract registered Express routes from the app's internal router
   * stack. Walks mounted routers recursively and builds { method, path } pairs.
   * Compatible with Express 5 (uses app.router, layer.slash, layer.matchers).
   */
  function extractExpressRoutes(expressApp) {
    const routes = [];
    const router = expressApp.router || expressApp._router;
    if (!router || !router.stack) return routes;

    // Build candidate mount prefixes from route filenames in src/routes/
    const routeDir = path.resolve(__dirname, '../../src/routes');
    let candidates;
    try {
      candidates = fs.readdirSync(routeDir)
        .filter(f => f.endsWith('.js'))
        .map(f => '/' + f.replace('.js', ''));
    } catch (e) {
      candidates = ['/books', '/health'];
    }

    function getPrefix(layer) {
      // Express 5: layer.slash === true means mounted at '/'
      if (layer.slash) return '';
      // Express 4 fallback: layer.regexp.fast_slash
      if (layer.regexp && layer.regexp.fast_slash) return '';

      // Express 5: probe the matcher function to determine the mount path
      if (layer.matchers && layer.matchers.length > 0) {
        const matcher = layer.matchers[0];
        for (const c of candidates) {
          const result = matcher(c);
          if (result && result.path) {
            return result.path.replace(/\/$/, '');
          }
        }
      }

      // Express 4 fallback: extract from layer.regexp
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace(/\\\//g, '/')
          .match(/^\^(\/[a-zA-Z0-9_\-/]*)/);
        if (match) return match[1].replace(/\/$/, '');
      }

      return '';
    }

    function walk(stack, prefix) {
      for (const layer of stack) {
        if (layer.route) {
          let full = (prefix + layer.route.path).replace(/\/+/g, '/');
          if (full !== '/' && full.endsWith('/')) full = full.slice(0, -1);
          for (const m of Object.keys(layer.route.methods)) {
            routes.push({ method: m, path: full });
          }
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          walk(layer.handle.stack, prefix + getPrefix(layer));
        }
      }
    }

    walk(router.stack, '');
    return routes;
  }

  // Test 1 — Generated spec is valid OpenAPI 3.0
  test('Generated spec is valid OpenAPI 3.0', async () => {
    const api = await SwaggerParser.validate(JSON.parse(JSON.stringify(swaggerSpec)));
    expect(api).toBeDefined();
    expect(api.openapi).toBe('3.0.0');
  });

  // Test 2 — Every defined route has a path in the spec
  test('Every defined route has a path in the spec', () => {
    const allRoutes = extractExpressRoutes(app);
    // Filter to API routes only (exclude documentation endpoints like /docs)
    const apiRoutes = allRoutes.filter(r => !r.path.startsWith('/docs'));
    const specPaths = Object.keys(swaggerSpec.paths);

    expect(apiRoutes.length).toBeGreaterThan(0);

    for (const route of apiRoutes) {
      // Convert Express-style params (:id) to OpenAPI-style ({id})
      const openApiPath = route.path.replace(/:([^/]+)/g, '{$1}');
      expect(specPaths).toContain(openApiPath);
    }
  });

  // Test 3 — All response codes are documented
  test('All response codes are documented', () => {
    // Known map of response codes per route based on handler implementations
    const expectedResponses = {
      'GET /health': ['200'],
      'POST /books': ['201', '400', '409'],
      'GET /books': ['200'],
      'GET /books/{id}': ['200', '400', '404'],
      'GET /books/{id}/history': ['200', '400', '404'],
      'POST /books/{id}/checkout': ['200', '400', '404', '409'],
      'POST /books/{id}/return': ['200', '400', '404', '409'],
    };

    for (const [key, codes] of Object.entries(expectedResponses)) {
      const [method, ...pathParts] = key.split(' ');
      const routePath = pathParts.join(' ');
      const specPath = swaggerSpec.paths[routePath];
      expect(specPath).toBeDefined();
      const operation = specPath[method.toLowerCase()];
      expect(operation).toBeDefined();
      expect(operation.responses).toBeDefined();
      const documentedCodes = Object.keys(operation.responses);
      for (const code of codes) {
        expect(documentedCodes).toContain(code);
      }
    }
  });

  // Test 4 — Spec contains required info fields
  test('Spec contains required info fields', () => {
    expect(swaggerSpec.info).toBeDefined();
    expect(typeof swaggerSpec.info.title).toBe('string');
    expect(swaggerSpec.info.title.length).toBeGreaterThan(0);
    expect(typeof swaggerSpec.info.version).toBe('string');
    expect(swaggerSpec.info.version.length).toBeGreaterThan(0);
    expect(typeof swaggerSpec.info.description).toBe('string');
    expect(swaggerSpec.info.description.length).toBeGreaterThan(0);
  });

  // Test 5 — All paths have at least one tag
  test('All paths have at least one tag', () => {
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    const paths = swaggerSpec.paths;

    expect(Object.keys(paths).length).toBeGreaterThan(0);

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const method of httpMethods) {
        if (pathItem[method]) {
          expect(Array.isArray(pathItem[method].tags)).toBe(true);
          expect(pathItem[method].tags.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
