import { describe, expect, it } from 'vitest';
import { detectSource } from '../src/import/detect';

describe('diagram import detection', () => {
  it('uses the explicit format, then file extension, then a confident signature', () => {
    expect(detectSource('a -> b').status).toBe('unknown');
    expect(detectSource('flowchart LR\nA-->B', { filename: 'x.dot' })).toMatchObject({
      format: 'dot',
      via: 'extension',
    });
    expect(detectSource('x', { filename: 'x.dot', format: 'd2' })).toMatchObject({
      format: 'd2',
      via: 'explicit',
    });
    expect(detectSource('graph LR\nA{Decision} --> B')).toMatchObject({
      format: 'mermaid',
      via: 'signature',
    });
    expect(detectSource('strict digraph G { a -> b }')).toMatchObject({
      format: 'dot',
      via: 'signature',
    });
    expect(detectSource('prose', { filename: 'x.constructor' }).status).toBe('unknown');
  });

  it('extracts a single closed diagram fence and asks for a choice when there are several', () => {
    const fence = '`'.repeat(3);
    const text = `# Notes\n${fence}mermaid\nflowchart LR\nA-->B\n${fence}\n`;
    expect(detectSource(text)).toMatchObject({
      format: 'mermaid',
      source: 'flowchart LR\nA-->B',
      startLine: 3,
    });
    expect(detectSource(text + '~~~dot\ndigraph {a->b}\n~~~').status).toBe('choose-fence');
    expect(detectSource(fence + 'd2\na -> b').status).toBe('unknown');
  });
});
