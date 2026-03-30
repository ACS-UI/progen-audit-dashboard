/* eslint-disable no-console */
const { buildAllTailwindFiles } = require('./tailwind-tools.js');

try {
  buildAllTailwindFiles();
} catch (error) {
  console.error('Tailwind build failed.', error);
  process.exitCode = 1;
}
