const argon2 = require('argon2');
let PrismaClient;

try {
  ({ PrismaClient } = require('./dist/generated/client'));
  console.log('Using Prisma client from ./dist/generated/client');
} catch (e) {
  try {
    ({ PrismaClient } = require('./src/generated/client'));
    console.log('Using Prisma client from ./src/generated/client');
  } catch (e2) {
    console.error('Could not find PrismaClient in ./dist or ./src');
    process.exit(1);
  }
}

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Test@1234';

async function resetPasswords() {
  try {
    const hashedPassword = await argon2.hash(DEFAULT_PASSWORD);
    console.log('Generated hash:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    
    // Verify the hash works
    const isValid = await argon2.verify(hashedPassword, DEFAULT_PASSWORD);
    console.log('Self-verify:', isValid);
    
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log(`\nFound ${users.length} users. Resetting passwords to: ${DEFAULT_PASSWORD}\n`);
    
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      console.log(`✅ Reset password for: ${user.email}`);
    }
    
    // Final verification - read back and verify
    const admin = await prisma.user.findFirst({ where: { email: 'admin@alikohub.com' } });
    if (admin) {
      const verify = await argon2.verify(admin.password, DEFAULT_PASSWORD);
      console.log(`\nVerification for admin@alikohub.com: ${verify}`);
    }
    
    console.log('\n✅ All passwords reset successfully!');
    console.log(`Password for ALL users: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    console.error('Error during reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();
