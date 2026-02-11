const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('.env.example template', () => {
  const envExamplePath = path.resolve(__dirname, '..', '.env.example');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(envExamplePath, 'utf-8');
  });

  test('.env.example file exists at the project root', () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  test('contains PORT=3000', () => {
    expect(content).toMatch(/^PORT=3000$/m);
  });

  test('contains NODE_ENV=development', () => {
    expect(content).toMatch(/^NODE_ENV=development$/m);
  });

  test('does not contain real secrets or credentials', () => {
    const secretPatterns = [
      /password/i,
      /secret/i,
      /api_key/i,
      /apikey/i,
      /token/i,
      /private_key/i,
      /credential/i,
    ];
    for (const pattern of secretPatterns) {
      expect(content).not.toMatch(pattern);
    }
  });

  test('.env.example is not excluded by .gitignore', () => {
    const gitignorePath = path.resolve(__dirname, '..', '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    // .gitignore should not contain a line that would exclude .env.example
    const lines = gitignoreContent.split('\n').map((l) => l.trim());
    expect(lines).not.toContain('.env.example');
  });

  test('copying .env.example to .env allows dotenv to load PORT and NODE_ENV', () => {
    const envPath = path.resolve(__dirname, '..', '.env.dotenv-test');
    try {
      fs.copyFileSync(envExamplePath, envPath);
      // Use a fresh node process with no inherited NODE_ENV so dotenv values take effect
      const script = [
        "delete process.env.NODE_ENV;",
        "delete process.env.PORT;",
        `require('dotenv').config({ path: '${envPath.replace(/\\/g, '/')}', quiet: true });`,
        "console.log(process.env.PORT + ' ' + process.env.NODE_ENV);"
      ].join(' ');
      const result = execSync(
        `node -e "${script}"`,
        { cwd: path.resolve(__dirname, '..'), encoding: 'utf-8', env: { ...process.env, NODE_ENV: undefined } }
      ).trim();
      expect(result).toBe('3000 development');
    } finally {
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
      }
    }
  });
});
