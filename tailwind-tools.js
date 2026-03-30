/* eslint-disable no-console */
const { execFileSync } = require('child_process');
const {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('fs');
const path = require('path');
const fg = require('fast-glob');

const TAILWIND_PATTERNS = [
  './blocks/**/*.tw.css',
  './styles/**/*.tw.css',
];
const GLOBAL_TAILWIND_INPUT = './styles/global.tw.css';

const tailwindCliPackagePath = require.resolve('@tailwindcss/cli/package.json');
const tailwindCliPackage = JSON.parse(readFileSync(tailwindCliPackagePath, 'utf8'));
const tailwindCliEntry = path.join(
  path.dirname(tailwindCliPackagePath),
  tailwindCliPackage.bin.tailwindcss,
);

function toPosixRelativePath(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join('/');
  return normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`;
}

function stripSharedTailwindCss(css) {
  return css
    .replace(/^\/\*![\s\S]*?\*\/\s*/, '')
    .trim()
    .concat('\n');
}

function compileTailwindInput(inputPath, outputPath) {
  const temporaryInputPath = path.join(
    path.dirname(outputPath),
    `${path.basename(outputPath, '.css')}.build.css`,
  );
  const importPath = path.relative(path.dirname(temporaryInputPath), path.resolve(inputPath));

  try {
    writeFileSync(temporaryInputPath, `@import '${toPosixRelativePath(importPath)}';\n`);

    execFileSync(
      process.execPath,
      [tailwindCliEntry, '-i', temporaryInputPath, '-o', outputPath],
      { stdio: 'inherit' },
    );
  } finally {
    rmSync(temporaryInputPath, { force: true });
  }
}

function listTailwindInputs() {
  return fg
    .sync(TAILWIND_PATTERNS)
    .sort((left, right) => {
      const leftIsStyle = left.startsWith('./styles/');
      const rightIsStyle = right.startsWith('./styles/');
      return Number(rightIsStyle) - Number(leftIsStyle);
    });
}

function isBlockFile(inputPath) {
  return inputPath.replace(/^\.\//, '').startsWith('blocks/');
}

function getOutputPath(inputPath) {
  return inputPath.replace(/\.tw\.css$/, '.css');
}

function writeIfChanged(filePath, contents) {
  const current = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
  if (current !== contents) {
    writeFileSync(filePath, contents);
  }
}

function stripBlockRuntime(css) {
  const content = stripSharedTailwindCss(css);
  const withoutPrelude = content.replace(/^@layer properties;\s*/, '');
  const runtimeStart = withoutPrelude.indexOf('@property --tw');

  if (runtimeStart === -1) {
    return withoutPrelude;
  }

  return `${withoutPrelude.slice(0, runtimeStart).trim()}\n`;
}

function extractRuntimeCss(css) {
  const content = stripSharedTailwindCss(css);
  const hasPrelude = content.startsWith('@layer properties;');
  const withoutPrelude = content.replace(/^@layer properties;\s*/, '');
  const runtimeStart = withoutPrelude.indexOf('@property --tw');

  if (runtimeStart === -1) {
    return '';
  }

  const runtimeContent = withoutPrelude.slice(runtimeStart).trim();
  return `${hasPrelude ? '@layer properties;\n' : ''}${runtimeContent}\n`;
}

function buildRuntimeBundle(blockInputs) {
  if (!blockInputs.length) {
    return '';
  }

  const temporaryInputPath = path.join(process.cwd(), '.tailwind-runtime.build.css');
  const temporaryOutputPath = path.join(process.cwd(), '.tailwind-runtime.out.css');
  const imports = blockInputs
    .map((inputPath) => `@import '${toPosixRelativePath(inputPath)}';`)
    .join('\n');

  try {
    writeFileSync(temporaryInputPath, `${imports}\n`);
    execFileSync(
      process.execPath,
      [tailwindCliEntry, '-i', temporaryInputPath, '-o', temporaryOutputPath],
      { stdio: 'inherit' },
    );

    return extractRuntimeCss(readFileSync(temporaryOutputPath, 'utf8'));
  } finally {
    rmSync(temporaryInputPath, { force: true });
    rmSync(temporaryOutputPath, { force: true });
  }
}

function buildAllTailwindFiles() {
  const inputs = listTailwindInputs();
  const blockInputs = inputs.filter(isBlockFile);
  const styleInputs = inputs.filter(
    (inputPath) => !isBlockFile(inputPath) && inputPath !== GLOBAL_TAILWIND_INPUT,
  );

  styleInputs.forEach((inputPath) => {
    const outputPath = getOutputPath(inputPath);
    console.log(`Building: ${inputPath} -> ${outputPath}`);
    compileTailwindInput(inputPath, outputPath);
  });

  blockInputs.forEach((inputPath) => {
    const outputPath = getOutputPath(inputPath);
    console.log(`Building: ${inputPath} -> ${outputPath}`);
    compileTailwindInput(inputPath, outputPath);
    writeIfChanged(outputPath, stripBlockRuntime(readFileSync(outputPath, 'utf8')));
  });

  const globalOutputPath = getOutputPath(GLOBAL_TAILWIND_INPUT);
  const temporaryGlobalOutputPath = path.join(process.cwd(), '.tailwind-global.out.css');

  console.log(`Building: ${GLOBAL_TAILWIND_INPUT} -> ${globalOutputPath}`);

  try {
    compileTailwindInput(GLOBAL_TAILWIND_INPUT, temporaryGlobalOutputPath);
    const globalCss = stripSharedTailwindCss(readFileSync(temporaryGlobalOutputPath, 'utf8'));
    const runtimeCss = buildRuntimeBundle(blockInputs);
    writeIfChanged(
      globalOutputPath,
      runtimeCss ? `${globalCss.trimEnd()}\n${runtimeCss}` : globalCss,
    );
  } finally {
    rmSync(temporaryGlobalOutputPath, { force: true });
  }
}

module.exports = {
  buildAllTailwindFiles,
  listTailwindInputs,
};
