const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin@alikohub.com';
  const newPassword = 'password123';
  const hash = await argon2.hash(newPassword);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hash }
  });
  
  console.log('Successfully reset password for:', user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
