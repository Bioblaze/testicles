const fs = require('fs');
const path = require('path');

describe('Production server entry point (src/server.js)', () => {
  const serverPath = path.resolve(__dirname, '..', 'src', 'server.js');
  let source;

  beforeAll(() => {
    source = fs.readFileSync(serverPath, 'utf-8');
  });

  test('src/server.js exists', () => {
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  test('package.json "main" field points to src/server.js', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8')
    );
    expect(pkg.main).toBe('src/server.js');
  });

  test('dotenv/config is required before importing the app', () => {
    const dotenvIndex = source.indexOf("require('dotenv/config')");
    const appIndex = source.indexOf("require('./app')");
    expect(dotenvIndex).not.toBe(-1);
    expect(appIndex).not.toBe(-1);
    expect(dotenvIndex).toBeLessThan(appIndex);
  });

  test('PORT is read from process.env with a default of 3000', () => {
    expect(source).toMatch(/process\.env\.PORT/);
    expect(source).toMatch(/\|\|\s*3000/);
  });

  test('app.listen is called with PORT', () => {
    expect(source).toMatch(/app\.listen\(\s*PORT/);
  });

  test('a startup message is logged to stdout', () => {
    expect(source).toMatch(/console\.log/);
    expect(source).toMatch(/Server listening on port/);
  });

  test('src/server.js is excluded from Jest coverage', () => {
    const configPath = path.resolve(__dirname, '..', 'jest.config.js');
    expect(fs.existsSync(configPath)).toBe(true);
    const config = require(configPath);
    const patterns = config.coveragePathIgnorePatterns || [];
    const excludesServer = patterns.some((p) =>
      new RegExp(p).test('src/server.js')
    );
    expect(excludesServer).toBe(true);
  });
});
