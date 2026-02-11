const fs = require('fs');
const path = require('path');

describe('Project directory structure', () => {
  const root = path.resolve(__dirname, '..');

  test('src/ directory exists at the project root', () => {
    const srcPath = path.join(root, 'src');
    expect(fs.existsSync(srcPath)).toBe(true);
    expect(fs.statSync(srcPath).isDirectory()).toBe(true);
  });

  test('src/routes/ directory exists inside src/', () => {
    const routesPath = path.join(root, 'src', 'routes');
    expect(fs.existsSync(routesPath)).toBe(true);
    expect(fs.statSync(routesPath).isDirectory()).toBe(true);
  });

  test('test/ directory exists at the project root', () => {
    const testPath = path.join(root, 'test');
    expect(fs.existsSync(testPath)).toBe(true);
    expect(fs.statSync(testPath).isDirectory()).toBe(true);
  });

  test('.github/ directory exists at the project root', () => {
    const githubPath = path.join(root, '.github');
    expect(fs.existsSync(githubPath)).toBe(true);
    expect(fs.statSync(githubPath).isDirectory()).toBe(true);
  });

  test('.github/workflows/ directory exists inside .github/', () => {
    const workflowsPath = path.join(root, '.github', 'workflows');
    expect(fs.existsSync(workflowsPath)).toBe(true);
    expect(fs.statSync(workflowsPath).isDirectory()).toBe(true);
  });

  test('directory structure matches the tier document layout', () => {
    const expectedDirs = [
      'src',
      path.join('src', 'routes'),
      'test',
      '.github',
      path.join('.github', 'workflows'),
    ];

    for (const dir of expectedDirs) {
      const fullPath = path.join(root, dir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).isDirectory()).toBe(true);
    }
  });
});
