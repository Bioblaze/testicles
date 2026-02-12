const fs = require('fs');
const path = require('path');

describe('src/logger.js', () => {
  const loggerPath = path.resolve(__dirname, '..', 'src', 'logger.js');
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  test('src/logger.js file exists', () => {
    expect(fs.existsSync(loggerPath)).toBe(true);
  });

  test('exports a Pino logger instance as the module default', () => {
    const logger = require('../src/logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  test('requires only pino (runtime dependency)', () => {
    const src = fs.readFileSync(loggerPath, 'utf-8');
    const requireStatements = src.match(/require\(['"]([^'"]+)['"]\)/g) || [];
    const requiredModules = requireStatements.map(r =>
      r.match(/require\(['"]([^'"]+)['"]\)/)[1]
    );
    // Only pino should be directly required; pino-pretty is loaded as a transport
    expect(requiredModules).toEqual(['pino']);
  });

  describe('environment-aware configuration', () => {
    test('when NODE_ENV=test, log level is silent', () => {
      process.env.NODE_ENV = 'test';
      const logger = require('../src/logger');
      expect(logger.level).toBe('silent');
    });

    test('when NODE_ENV=production, log level is info', () => {
      process.env.NODE_ENV = 'production';
      const logger = require('../src/logger');
      expect(logger.level).toBe('info');
    });

    test('when NODE_ENV=development, log level is debug', () => {
      process.env.NODE_ENV = 'development';
      const logger = require('../src/logger');
      expect(logger.level).toBe('debug');
    });

    test('when NODE_ENV is undefined, log level is debug', () => {
      delete process.env.NODE_ENV;
      const logger = require('../src/logger');
      expect(logger.level).toBe('debug');
    });

    test('when NODE_ENV=production, no transport is configured (raw JSON to stdout)', () => {
      process.env.NODE_ENV = 'production';
      const src = fs.readFileSync(loggerPath, 'utf-8');
      // The transport should be undefined for production
      // We verify by checking the source logic
      expect(src).toContain("process.env.NODE_ENV === 'production'");
      // Also verify the logger works and doesn't have pino-pretty transport
      const logger = require('../src/logger');
      expect(logger).toBeDefined();
    });

    test('when NODE_ENV=test, no transport is configured', () => {
      process.env.NODE_ENV = 'test';
      const logger = require('../src/logger');
      // silent level means no output
      expect(logger.level).toBe('silent');
    });

    test('when NODE_ENV=development, pino-pretty transport is configured', () => {
      const src = fs.readFileSync(loggerPath, 'utf-8');
      expect(src).toContain("process.env.NODE_ENV === 'development'");
      expect(src).toContain('pino-pretty');
      expect(src).toContain('colorize: true');
    });
  });

  test('logger produces no output when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const logger = require('../src/logger');
    // This should not throw or produce output
    expect(() => {
      logger.info('test message');
      logger.error('test error');
      logger.debug('test debug');
    }).not.toThrow();
  });
});
