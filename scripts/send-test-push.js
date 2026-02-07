const fs = require('fs');
const path = require('path');

const admin = require(path.join(
  __dirname,
  '../firebase/functions/node_modules/firebase-admin'
));

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
const apnsTopic = getArgValue('--apnsTopic', 'com.gosenderr.senderr');
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

const message = {
  token,
  data,
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

if (!dataOnly) {
  message.notification = { title, body };
}

admin
  .messaging()
  .send(message)
  .then((response) => {
    console.log('Push sent:', response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Push failed:', error?.message || error);
    if (error?.errorInfo) {
      console.error('Error info:', error.errorInfo);
    }
    process.exit(1);
  });
