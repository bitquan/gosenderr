const fs = require('fs');
const path = require('path');

let admin;
try {
  admin = require('firebase-admin');
} catch (_error) {
  admin = require(path.join(
    __dirname,
    '../firebase/functions/node_modules/firebase-admin'
  ));
}

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'gosenderr-6773f';

const args = process.argv.slice(2);
const getArgValue = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1 || idx === args.length - 1) return fallback;
  return args[idx + 1];
};

const hasFlag = (name) => args.includes(name);

const token = getArgValue('--token');
if (!token) {
  console.error('Missing --token');
  process.exit(1);
}

const title = getArgValue('--title', 'GoSenderr Test');
const body = getArgValue('--body', 'Push check');
const serviceAccountPath = getArgValue('--serviceAccount');
const apnsTopic = getArgValue('--apnsTopic', 'com.gosenderr.courier');
const dataOnly = hasFlag('--dataOnly');

const dataPairs = args
  .filter((arg) => arg.startsWith('--data='))
  .map((arg) => arg.replace('--data=', ''));

const data = dataPairs.reduce((acc, pair) => {
  const [key, ...rest] = pair.split('=');
  if (!key) return acc;
  acc[key] = rest.join('=');
  return acc;
}, {});

if (admin.apps.length === 0) {
  if (serviceAccountPath) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || PROJECT_ID,
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
  }
}

const baseMessage = {
  token,
  data,
};

if (!dataOnly) {
  baseMessage.notification = { title, body };
}

const messageWithApns = {
  ...baseMessage,
  apns: {
    headers: {
      'apns-push-type': dataOnly ? 'background' : 'alert',
      'apns-topic': apnsTopic,
      'apns-priority': '10',
    },
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        'content-available': 1,
      },
    },
  },
};

const send = async () => {
  try {
    const response = await admin.messaging().send(messageWithApns);
    console.log('Push sent:', response);
    process.exit(0);
  } catch (primaryError) {
    if (apnsTopic) {
      console.warn(
        'Primary send with APNs headers failed; retrying without APNs overrides...',
        primaryError?.errorInfo || primaryError?.message || primaryError
      );
      try {
        const fallbackResponse = await admin.messaging().send(baseMessage);
        console.log('Push sent (fallback):', fallbackResponse);
        process.exit(0);
      } catch (fallbackError) {
        console.error('Push failed (fallback):', fallbackError?.message || fallbackError);
        if (fallbackError?.errorInfo) {
          console.error('Fallback error info:', fallbackError.errorInfo);
        }
        process.exit(1);
      }
    }
    console.error('Push failed:', primaryError?.message || primaryError);
    if (primaryError?.errorInfo) {
      console.error('Error info:', primaryError.errorInfo);
    }
    process.exit(1);
  }
};

send();
