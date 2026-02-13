import {spawnSync} from 'child_process';
import path from 'path';

test('seed-courier-emulator aborts when non-demo target is specified without allow flag', () => {
  const script = path.resolve(__dirname, '../../../../scripts/seed-courier-emulator.js');
  const env = Object.assign({}, process.env, {SENDERR_FIREBASE_PROJECT_ID: 'gosenderr-6773f'});
  const res = spawnSync('node', [script], {env, encoding: 'utf8'});
  // script should exit with non-zero and print the non-demo error
  expect(res.status).not.toBe(0);
  expect(res.stderr + res.stdout).toMatch(/locked to demo-senderr/i);
});
