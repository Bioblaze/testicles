const fs = require('fs');
const path = require('path');

describe('production dependencies', () => {
  let pkg;

  beforeAll(() => {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    pkg = JSON.parse(raw);
  });

  test('express is listed under dependencies', () => {
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies.express).toBeDefined();
  });

  test('dotenv is listed under dependencies', () => {
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies.dotenv).toBeDefined();
  });

  test('express can be required without errors', () => {
    expect(() => require('express')).not.toThrow();
  });

  test('dotenv can be required without errors', () => {
    expect(() => require('dotenv')).not.toThrow();
  });

  test('package-lock.json exists', () => {
    const lockPath = path.resolve(__dirname, '..', 'package-lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  test('node_modules is excluded by .gitignore', () => {
    const gitignorePath = path.resolve(__dirname, '..', '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toMatch(/node_modules/);
  });
});
