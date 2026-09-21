
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

    const email = 'conshifter.admin@alikohub.com';
    const password = 'ConshifterAdmin123!';

    try {
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email,
                password,
                displayName: 'Conshifter Admin'
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
            where: { firebaseId: userRecord.uid },
            update: {
                password: hashedPassword,
                globalRole: 'ADMIN',
                conshifterUser: {
                    upsert: {
                        create: {
                            role: 'ADMIN',
                            status: 'ACTIVE'
                        },
                        update: {
                            role: 'ADMIN',
                            status: 'ACTIVE'
                        }
                    }
                }
            },
            create: {
                firebaseId: userRecord.uid,
                email: userRecord.email,
                firstname: 'Conshifter',
                lastname: 'Admin',
                password: hashedPassword,
                globalRole: 'ADMIN',
                status: 'ACTIVE',
                conshifterUser: {
                    create: {
                        role: 'ADMIN',
                        status: 'ACTIVE'
                    }
                }
            }
        });
        console.log('DB record updated in Auth Service');
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
