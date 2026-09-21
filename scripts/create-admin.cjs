const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const admin = require('firebase-admin');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@alikohub.com';
  const password = 'AdminPassword123!';
  const hashedPassword = await argon2.hash(password);
  
  // 1. Initialize Firebase Admin
  console.log('Initializing Firebase Admin...');
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH not found or invalid');
    process.exit(1);
  }
  
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  let firebaseUser;
  try {
    firebaseUser = await admin.auth().getUserByEmail(email);
    console.log(`Firebase user already exists: ${firebaseUser.uid}`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log('Creating new Firebase user...');
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: 'System Admin',
      });
      console.log(`Firebase user created: ${firebaseUser.uid}`);
    } else {
      throw e;
    }
  }

  const firebaseId = firebaseUser.uid;

  // 2. Database User
  console.log(`Checking if DB user exists: ${email}`);
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('DB user already exists. Updating details and role.');
    await prisma.user.update({
      where: { email },
      data: { 
        globalRole: 'ADMIN',
        firebaseId, // Ensure Firebase ID is synced
        password: hashedPassword,
        status: 'ACTIVE'
      }
    });
  } else {
    console.log('Creating new DB admin user...');
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firebaseId,
        firstname: 'System',
        lastname: 'Admin',
        globalRole: 'ADMIN',
        status: 'ACTIVE',
        academyUser: {
          create: {
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        },
        careersUser: {
          create: {
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        }
      }
    });
    console.log('DB admin user created successfully!');
  }
}

main()
  .catch((e) => {
    console.error('Error detail:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
