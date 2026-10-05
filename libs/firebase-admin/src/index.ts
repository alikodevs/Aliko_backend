import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import * as fs from 'fs';

export type FirebaseAdminOptions = {
  /** When true, missing credentials log a warning instead of throwing. */
  optional?: boolean;
  serviceAccountPath?: string;
};

/**
 * Initialize Firebase Admin once per process.
 * Returns true if an app is available (existing or newly created).
 */
export function ensureFirebaseAdmin(options: FirebaseAdminOptions = {}): boolean {
  if (admin.apps.length) {
    return true;
  }

  const candidatePaths = [
    options.serviceAccountPath,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    './firebase-service-account.json',
    '../firebase-service-account.json',
    '/root/Home-Project/firebase-service-account.json',
    '/usr/src/app/firebase-service-account.json',
  ].filter(Boolean) as string[];

  const serviceAccountPath =
    candidatePaths.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) ||
    options.serviceAccountPath ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    '/usr/src/app/firebase-service-account.json';

  const missingOrNotFile =
    !fs.existsSync(serviceAccountPath) || !fs.statSync(serviceAccountPath).isFile();
  if (missingOrNotFile) {
    const message = `Firebase credentials file not found at ${serviceAccountPath}`;
    if (options.optional) {
      console.warn(`[firebase-admin] ${message}. Continuing without Firebase.`);
      return false;
    }
    throw new Error(message);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (!serviceAccount || !serviceAccount.project_id) {
      throw new Error('Firebase credentials file is empty or invalid');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[firebase-admin] Firebase Admin initialized successfully.');
    return true;
  } catch (err) {
    if (options.optional) {
      console.warn(
        `[firebase-admin] Failed to initialize from ${serviceAccountPath}: ${(err as Error).message}. Continuing without Firebase.`,
      );
      return false;
    }
    throw err;
  }
}

export function getFirebaseAuth(): Auth {
  const ok = ensureFirebaseAdmin({ optional: true });
  if (!ok || !admin.apps.length) {
    throw new Error(
      'Firebase is not configured. Provide a valid service account JSON at FIREBASE_SERVICE_ACCOUNT_PATH.',
    );
  }
  return admin.auth();
}

export { admin };
