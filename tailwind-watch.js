/* eslint-disable no-console */
const { statSync } = require('fs');
const { buildAllTailwindFiles, listTailwindInputs } = require('./tailwind-tools.js');

const builtMtimes = new Map();
let syncTimer = null;
let syncInFlight = false;
let queuedSync = false;

function getFileMtime(filePath) {
  try {
    return statSync(filePath).mtimeMs;
  } catch (error) {
    return null;
  }
}

function syncBuilds(force = false) {
  if (syncInFlight) {
    queuedSync = true;
    return;
  }

  syncInFlight = true;

  try {
    const inputs = listTailwindInputs();
    const nextInputs = new Set(inputs);
    let hasChanges = !!force;

    inputs.forEach((inputPath) => {
      const currentMtime = getFileMtime(inputPath);
      const previousMtime = builtMtimes.get(inputPath);

      if (currentMtime == null) {
        return;
      }

      if (previousMtime == null || previousMtime !== currentMtime) {
        hasChanges = true;
      }

      builtMtimes.set(inputPath, currentMtime);
    });

    Array.from(builtMtimes.keys()).forEach((inputPath) => {
      if (!nextInputs.has(inputPath)) {
        builtMtimes.delete(inputPath);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      try {
        buildAllTailwindFiles();
      } catch (error) {
        console.error('Failed rebuilding Tailwind outputs', error);
      }
    }
  } finally {
    syncInFlight = false;
    if (queuedSync) {
      queuedSync = false;
      setTimeout(() => {
        syncBuilds();
      }, 0);
    }
  }
}

function scheduleSync(force = false) {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncBuilds(force);
  }, 120);
}

console.log('Watching Tailwind sources in ./blocks and ./styles');
syncBuilds(true);
setInterval(() => {
  scheduleSync();
}, 750);
