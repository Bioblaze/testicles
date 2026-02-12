const pino = require('pino');

const logger = pino({
  level: process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

module.exports = logger;
