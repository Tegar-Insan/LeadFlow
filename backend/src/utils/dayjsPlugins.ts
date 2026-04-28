import { createRequire } from 'module';
import type { PluginFunc } from 'dayjs';

const require = createRequire(import.meta.url);

export const utc: PluginFunc = require('dayjs/plugin/utc');
export const timezone: PluginFunc = require('dayjs/plugin/timezone');