import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { listen } from '../src/cli/open';

const servers: http.Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(s => new Promise(r => s.close(r))));
});

/** Hold a port on IPv6 loopback only, as another `localhost` dev server does. */
async function decoy() {
  const s = http.createServer();
  servers.push(s);
  await new Promise<void>(r => s.listen(0, '::1', r));
  return (s.address() as AddressInfo).port;
}

describe('open port selection', () => {
  it('moves past a default port held on IPv6', async () => {
    const held = await decoy();
    const server = http.createServer();
    servers.push(server);
    const port = await listen(server, { port: held, portGiven: false });
    expect(port).not.toBe(held);
  });

  it('refuses an explicit port held on IPv6', async () => {
    const held = await decoy();
    const server = http.createServer();
    servers.push(server);
    await expect(listen(server, { port: held, portGiven: true })).rejects.toThrow(/already in use/);
  });

  it('lets the OS choose for port 0', async () => {
    const server = http.createServer();
    servers.push(server);
    expect(await listen(server, { port: 0, portGiven: true })).toBeGreaterThan(0);
  });
});
