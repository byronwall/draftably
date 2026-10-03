import ts from 'typescript';

// The imported JavaScript engines keep their existing types. Check module
// bindings separately so a lost prototype global cannot silently break a tool.
const configFile = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
if (!configFile) throw new Error('tsconfig.json was not found.');

const config = ts.readConfigFile(configFile, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));

const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  allowJs: true,
  checkJs: true,
});

// Missing names/exports, assignments to imports, and duplicate declarations.
const bindingCodes = new Set([2304, 2552, 2305, 2724, 2632, 2451]);
const errors = ts.getPreEmitDiagnostics(program).filter(error => bindingCodes.has(error.code));

if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: file => file,
    getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else {
  console.log('Module bindings passed.');
}
