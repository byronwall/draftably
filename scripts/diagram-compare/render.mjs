#!/usr/bin/env node
/** Native renderer adapters. PNGs are deliberately delegated to `pnpm shoot`. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright-core';
import { JSDOM } from 'jsdom';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const relative = file => path.relative(root, file).split(path.sep).join('/');
const launch = () =>
  chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const command = (file, args) =>
  exec(file, args, { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });

async function mermaidSvg(source, result) {
  const dist = path.join(root, 'node_modules/mermaid/dist');
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><body></body></html>');
        return;
      }
      const file = path.resolve(dist, `.${decodeURIComponent(pathname)}`);
      if (!file.startsWith(dist + path.sep)) throw Error('Outside module root');
      res.setHeader('Content-Type', 'text/javascript');
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await launch();
    result.browserVersion = browser.version();
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.route('**/*', route =>
      route
        .request()
        .url()
        .startsWith(origin + '/')
        ? route.continue()
        : route.abort(),
    );
    page.on('console', msg => {
      result.stderr += `[browser ${msg.type()}] ${msg.text()}\n`;
    });
    page.on('pageerror', error => {
      result.stderr += `[pageerror] ${error.message}\n`;
    });
    await page.goto(origin);
    return await page.evaluate(async input => {
      const { default: mermaid } = await import('/mermaid.esm.min.mjs');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        deterministicIds: true,
        deterministicIDSeed: 'diagram-comparison',
      });
      return (await mermaid.render('comparison-diagram', input)).svg;
    }, source);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

function svgMeasurements(svg) {
  const dom = new JSDOM(svg, { contentType: 'image/svg+xml' });
  try {
    const el = dom.window.document.documentElement;
    if (el.localName !== 'svg' || el.namespaceURI !== 'http://www.w3.org/2000/svg')
      throw Error('Renderer did not return an SVG document');
    return {
      widthAttribute: el.getAttribute('width'),
      heightAttribute: el.getAttribute('height'),
      viewBox: el.getAttribute('viewBox'),
      textElementCount: el.querySelectorAll('text').length,
      foreignObjectCount: el.querySelectorAll('foreignObject').length,
      note: 'Structural SVG measurements only; not node/edge counts, text visibility, overlap detection, or visual-quality scores.',
    };
  } finally {
    dom.window.close();
  }
}

/** A single attempt; failures are retained and never repaired or silently retried. */
export async function renderCell({ tool, sourcePath, outputDir }) {
  sourcePath = path.resolve(sourcePath);
  outputDir = path.resolve(outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  // Refuse to overwrite evidence from a previous attempt.
  const metadataPath = path.join(outputDir, 'render.json');
  try {
    await fs.access(metadataPath);
    throw Error(`Attempt already exists: ${metadataPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const result = {
    schemaVersion: 1,
    tool,
    sourcePath: relative(sourcePath),
    status: 'failed',
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    durationScope:
      'Single adapter wall time including startup and SVG validation; excludes generation, PNG capture and review. Not a comparative performance benchmark.',
    stdout: '',
    stderr: '',
  };
  const started = performance.now();
  try {
    const source = await fs.readFile(sourcePath, 'utf8');
    result.sourceBytes = Buffer.byteLength(source);
    result.sourceLines = source === '' ? 0 : source.replace(/\n$/, '').split('\n').length;
    let svg;
    if (tool === 'draftably') {
      result.renderer = 'Draftably repository CLI: inspect --svg';
      result.rendererVersion = (await command('git', ['rev-parse', 'HEAD'])).stdout.trim();
      const rendered = await command(process.execPath, [
        'scripts/draftably.mjs',
        'inspect',
        sourcePath,
        '--svg',
      ]);
      svg = rendered.stdout;
      result.stderr = rendered.stderr;
    } else if (tool === 'mermaid') {
      result.renderer = 'Mermaid native browser renderer';
      result.rendererVersion = JSON.parse(
        await fs.readFile(path.join(root, 'node_modules/mermaid/package.json'), 'utf8'),
      ).version;
      svg = await mermaidSvg(source, result);
    } else if (tool === 'd2') {
      result.renderer = 'D2 native WASM Node API (default layout)';
      result.rendererVersion = JSON.parse(
        await fs.readFile(path.join(root, 'node_modules/@d2lang/d2/package.json'), 'utf8'),
      ).version;
      const { D2 } = await import('@d2lang/d2');
      const d2 = new D2();
      try {
        const compiled = await d2.compile(source);
        svg = await d2.render(compiled.diagram, compiled.renderOptions);
      } finally {
        await d2.dispose();
      }
    } else if (tool === 'dot') {
      result.renderer = 'Graphviz system dot -Tsvg';
      const version = await command('dot', ['-V']);
      result.rendererVersion = (version.stderr || version.stdout).trim();
      const rendered = await command('dot', ['-Tsvg', sourcePath]);
      svg = rendered.stdout;
      result.stderr = rendered.stderr;
    } else if (tool === 'svg') {
      result.renderer = 'Raw SVG, unchanged, loaded directly in Chromium';
      svg = source;
      const browser = await launch();
      try {
        result.rendererVersion = browser.version();
        result.browserVersion = browser.version();
        const page = await browser.newPage();
        await page.route('**/*', route =>
          route.request().url().startsWith('file:') ? route.continue() : route.abort(),
        );
        await page.goto(pathToFileURL(sourcePath).href);
        await page.locator('svg').first().waitFor({ timeout: 10_000 });
      } finally {
        await browser.close();
      }
    } else {
      throw Error(`Unknown tool: ${tool}`);
    }
    result.svg = svgMeasurements(svg);
    const svgPath = path.join(outputDir, 'output.svg');
    await fs.writeFile(svgPath, svg);
    result.svgPath = relative(svgPath);
    result.svgBytes = Buffer.byteLength(svg);
    result.status = 'success';
  } catch (error) {
    result.error = error.stack || String(error);
    result.stdout += error.stdout || '';
    result.stderr += error.stderr || '';
    result.exitCode = error.code ?? null;
  }
  result.durationMs = Math.round((performance.now() - started) * 100) / 100;
  await fs.writeFile(path.join(outputDir, 'stdout.log'), result.stdout);
  await fs.writeFile(path.join(outputDir, 'stderr.log'), result.stderr);
  result.stdoutLog = relative(path.join(outputDir, 'stdout.log'));
  result.stderrLog = relative(path.join(outputDir, 'stderr.log'));
  result.logNote =
    'Successful SVG payload is output.svg rather than duplicated in stdout.log; browser diagnostics and subprocess error streams are retained. D2 API errors are recorded in error.';
  await fs.writeFile(metadataPath, JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [tool, sourcePath, outputDir] = process.argv.slice(2);
  if (!tool || !sourcePath || !outputDir) {
    console.error(
      'Usage: node scripts/diagram-compare/render.mjs <mermaid|draftably|d2|dot|svg> <source> <outputDir>',
    );
    process.exitCode = 2;
  } else {
    const result = await renderCell({ tool, sourcePath, outputDir });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'success') process.exitCode = 1;
  }
}
