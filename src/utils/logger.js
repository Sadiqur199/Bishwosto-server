/**
 * Tiny dependency-free logger with colors.
 * Keeps terminal output readable during local development.
 */

const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const stamp = () => `${colors.gray}[${new Date().toISOString()}]${colors.reset}`;

export const logger = {
  info: (...args) => console.log(stamp(), `${colors.cyan}INFO${colors.reset}`, ...args),
  success: (...args) => console.log(stamp(), `${colors.green}OK  ${colors.reset}`, ...args),
  warn: (...args) => console.warn(stamp(), `${colors.yellow}WARN${colors.reset}`, ...args),
  error: (...args) => console.error(stamp(), `${colors.red}ERR ${colors.reset}`, ...args),
};
