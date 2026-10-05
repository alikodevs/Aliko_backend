
const admin = require('firebase-admin');
const { PrismaClient } = require('./src/generated/client');
const argon2 = require('argon2');
const fs = require('fs');

async function run() {
    console.log('Script started');
    const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase initialized');

    const prisma = new PrismaClient();
    console.log('Prisma initialized');

    const email = 'admin@alikohub.com';
    const password = 'AdminPassword123!';

    try {
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email,
                password,
                displayName: 'Master Admin'
            });
            console.log('Firebase user created:', userRecord.uid);
        } catch (e) {
            if (e.code === 'auth/email-already-exists') {
                userRecord = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(userRecord.uid, { password });
                console.log('Firebase user updated');
            } else {
                throw e;
            }
        }

        const hashedPassword = await argon2.hash(password);
        await prisma.user.upsert({
            where: { email: userRecord.email },
            update: {
                password: hashedPassword,
                globalRole: 'ADMIN'
            },
            create: {
                firebaseId: userRecord.uid,
                email: userRecord.email,
                firstname: 'Master',
                lastname: 'Admin',
                password: hashedPassword,
                globalRole: 'ADMIN',
                status: 'ACTIVE',
                careersUser: {
                    create: {
                        role: 'ADMIN',
                        status: 'ACTIVE'
                    }
                }
            }
        });
        console.log('DB record updated');
        console.log('DONE');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
