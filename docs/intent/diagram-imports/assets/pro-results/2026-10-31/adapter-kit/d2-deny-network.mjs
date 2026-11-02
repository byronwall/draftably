import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import { isMainThread } from 'node:worker_threads';
if (process.env.D2_PROBE_LOG_NETWORK === '1') process.stderr.write('D2_PROBE_NETWORK_GUARD_INSTALLED ' + (isMainThread ? 'main' : 'worker') + '\n');
const denied = () => {
  process.stderr.write('D2_PROBE_NETWORK_ATTEMPT_BLOCKED\n');
  throw new Error('D2 probe: any network request is forbidden');
};
globalThis.fetch = denied;
http.request = denied;
http.get = denied;
https.request = denied;
https.get = denied;
syncBuiltinESMExports();
