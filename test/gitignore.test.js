const fs = require('fs');
const path = require('path');

describe('.gitignore configuration', () => {
  const gitignorePath = path.resolve(__dirname, '..', '.gitignore');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  });

  test('.gitignore file exists at the project root', () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  test('node_modules/ is listed as an ignored pattern', () => {
    expect(content).toMatch(/^node_modules\/$/m);
  });

  test('coverage/ is listed as an ignored pattern', () => {
    expect(content).toMatch(/^coverage\/$/m);
  });

  test('.env is listed as an ignored pattern', () => {
    expect(content).toMatch(/^\.env$/m);
  });

  test('*.db is listed as an ignored pattern', () => {
    expect(content).toMatch(/^\*\.db$/m);
  });

  test('data/ is listed as an ignored pattern', () => {
    expect(content).toMatch(/^data\/$/m);
  });

  test('.env.example is not ignored (no pattern would exclude it)', () => {
    // .env.example should NOT match the .env pattern (which is exact)
    // Split into lines and verify no line would ignore .env.example
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const wouldIgnoreEnvExample = lines.some(line => {
      // Exact match for .env.example
      if (line === '.env.example') return true;
      // Glob that would match .env.example like .env*
      if (line === '.env*') return true;
      return false;
    });
    expect(wouldIgnoreEnvExample).toBe(false);
  });
});
