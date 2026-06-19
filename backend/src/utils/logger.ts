import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const META_KEYS = new Set(['level', 'message', 'timestamp', 'stack']);

const devFormat = printf(
  (info) => {
    const level = String(info.level);
    const message = String(info.message);
    const ts = typeof info.timestamp === 'string' ? info.timestamp : '';
    const stack = typeof info.stack === 'string' ? info.stack : undefined;

    const meta = Object.fromEntries(
      Object.entries(info).filter(([key]) => !META_KEYS.has(key)),
    );
    const metaSuffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    return `${ts} [${level}] ${stack ?? message}${metaSuffix}`;
  },
);

const logger = createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env['NODE_ENV'] !== 'production'
      ? combine(colorize(), devFormat)
      : format.json(),
  ),
  transports: [
    new transports.Console(),
    ...(process.env['NODE_ENV'] === 'production'
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  silent: process.env['NODE_ENV'] === 'test',
});

export default logger;
