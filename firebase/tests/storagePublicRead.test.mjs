import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

const PROJECT_ID = 'gosenderr-testing';

async function run() {
  const rules = fs.readFileSync(`${process.cwd()}/storage.rules`, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules },
  });

  const vendor123 = testEnv.authenticatedContext('vendor123').storage();
  const smallBuf = Buffer.alloc(1024);
  await vendor123.ref('marketplace/vendor123/photo.jpg').put(smallBuf, { contentType: 'image/jpeg' });

  const anon = testEnv.unauthenticatedContext().storage();
  try {
    await assertSucceeds(anon.ref('marketplace/vendor123/photo.jpg').getDownloadURL());
    console.log('Storage Public Read Test: PASS - unauthenticated read allowed');
  } catch (err) {
    console.error('Storage Public Read Test: FAIL', err);
  }

  await testEnv.cleanup();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});