import { readFile } from 'node:fs/promises';
import { parseFenceOptions } from '../../../packages/markdown/src/metadata';
import { renderSvg, type Diagnostic } from '../../../src/runtime';
import { prepare } from '../../../packages/markdown/src/core';
import { describe, expect, it } from 'vitest';
import valid from './metadata/valid.json';
import invalid from './metadata/invalid-unknown-key.json';
import outputFixture from './output/static-image.json';
import diagnostics from './diagnostics/source-error.json';

const fixture = (path: string) => new URL(path, import.meta.url);
const source = (path: string) => readFile(fixture(path), 'utf8');
const options = (raw: { language: string; info: string }) =>
  parseFenceOptions(`${raw.language} ${raw.info}`);
const document = { path: 'docs/guide.md' };
const location = { sourceId: document.path, line: 1 };

// These checks use the runtime through the real Markdown core. A host adapter
// adds parser, include-root, source-map, emitter-replay and pass-through checks.
describe('integration fixtures: adapter-neutral contract', () => {
  it('normalizes the shared valid metadata and rejects host authority keys', async () => {
    expect(options(valid.raw)).toEqual(valid.normalized);
    expect(valid.defaults).toEqual({ mode: 'static', includeSource: false, links: 'none' });

    try {
      options(invalid.raw);
      throw new Error('Expected metadata rejection.');
    } catch (error) {
      expect(String(error)).toContain(invalid.expected.key);
    }
  });

  it('prepares the shared source as deterministic private-by-default SVG output', async () => {
    const metadataFixture = valid;
    const draft = await source(`./${outputFixture.source}`);
    expect(draft).toBe(metadataFixture.raw.body);
    const emitted: { fileName: string; url: string; svg: string }[] = [];
    const emitAsset = async (asset: { fileName: string; bytes: Uint8Array }) => {
      const svg = new TextDecoder().decode(asset.bytes);
      emitted.push({ fileName: asset.fileName, url: `/diagrams/${asset.fileName}`, svg });
      return { url: `/diagrams/${asset.fileName}` };
    };
    const prepared = await prepare(draft, options(metadataFixture.raw), location, document, 0, {
      emitAsset,
    });

    expect(outputFixture.options).toEqual({
      target: 'image',
      includeSource: false,
      links: { mode: 'none' },
    });
    expect(Boolean(prepared.asset)).toBe(outputFixture.expect.successful);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].fileName).toMatch(new RegExp(outputFixture.expect.assetNamePattern));
    expect(emitted[0].svg.startsWith('<svg')).toBe(outputFixture.expect.svgRoot);
    expect(emitted[0].svg.includes('data-draftably-source=')).toBe(
      !outputFixture.expect.sourceMetadataAbsent,
    );
    expect(emitted[0].svg.includes('example.invalid')).toBe(
      !outputFixture.expect.linksAbsentByDefault,
    );
    expect(prepared.node).toMatchObject({
      type: 'figure',
      data: { hProperties: { id: metadataFixture.normalized.id } },
      children: [
        {
          type: 'image',
          url: emitted[0].url,
          alt: outputFixture.expect.alternativeText,
          data: { hProperties: { width: expect.any(Number), height: expect.any(Number) } },
        },
        {
          type: 'figcaption',
          children: [{ type: 'text', value: metadataFixture.normalized.caption }],
        },
      ],
    });
    const image = (
      prepared.node as {
        children: { data?: { hProperties?: { width?: number; height?: number } } }[];
      }
    ).children[0];
    expect(
      (image.data?.hProperties?.width ?? 0) > 0 && (image.data?.hProperties?.height ?? 0) > 0,
    ).toBe(outputFixture.expect.positiveDimensions);

    const repeated = await prepare(draft, options(metadataFixture.raw), location, document, 0, {
      emitAsset,
    });
    expect(Boolean(repeated.asset)).toBe(outputFixture.expect.successful);
    expect(emitted[1].fileName === emitted[0].fileName).toBe(
      outputFixture.expect.sameInputAssetNameStable,
    );
    expect(emitted[1].svg).toBe(emitted[0].svg);
  });

  it('maps the shared runtime diagnostic to the original Markdown fence', async () => {
    const draft = await source(`./${diagnostics.sourceFile}`);
    const native = await renderSvg(draft, { sourceId: diagnostics.sourceFile });
    expect(!native.ok).toBe(diagnostics.expect.runtimeFailure);
    if (!native.ok) {
      expect(native.diagnostics[0]).toMatchObject({
        code: diagnostics.expect.runtimeCode,
        location: { line: diagnostics.expect.runtimeLine },
      });
    }
    let failure: (Error & { diagnostics?: Diagnostic[] }) | undefined;
    try {
      await prepare(
        draft,
        options(valid.raw),
        {
          sourceId: diagnostics.markdown.file,
          line: diagnostics.markdown.fenceOpeningLine,
        },
        { path: diagnostics.markdown.file },
        0,
        {
          emitAsset: async () => ({ url: '/unused.svg' }),
        },
      );
    } catch (error) {
      failure = error as Error & { diagnostics?: Diagnostic[] };
    }

    expect(failure).toBeDefined();
    expect(failure?.diagnostics?.[0]).toMatchObject({
      code: diagnostics.expect.runtimeCode,
      location: {
        sourceId: diagnostics.expect.adapterFile,
        line: diagnostics.expect.adapterLine,
      },
    });
  });
});
