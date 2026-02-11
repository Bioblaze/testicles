const fs = require('fs');
const path = require('path');

describe('package.json configuration', () => {
  let pkg;

  beforeAll(() => {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    pkg = JSON.parse(raw);
  });

  test('package.json exists at the project root and is valid JSON', () => {
    expect(pkg).toBeDefined();
    expect(typeof pkg).toBe('object');
  });

  test('"name" is set to "book-api"', () => {
    expect(pkg.name).toBe('book-api');
  });

  test('"main" is set to "src/server.js"', () => {
    expect(pkg.main).toBe('src/server.js');
  });

  test('"scripts.start" is "node src/server.js"', () => {
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.start).toBe('node src/server.js');
  });

  test('"scripts.test" is "jest --coverage --forceExit"', () => {
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.test).toBe('jest --coverage --forceExit');
  });

  test('"engines.node" is ">=18.0.0"', () => {
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBe('>=18.0.0');
  });
});
