// src/utils/logger.js
// Winston logger — structured logging for all environments

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV !== 'production'
      ? combine(colorize(), devFormat)
      : format.json()
  ),
  transports: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new transports.File({ filename: 'logs/error.log',   level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  silent: process.env.NODE_ENV === 'test',
});

module.exports = logger;
