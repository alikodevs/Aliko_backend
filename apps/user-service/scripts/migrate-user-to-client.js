const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration: USER -> CLIENT in ConTechRole');

  // Update ContechUser in Auth Service
  const updatedAuth = await prisma.contechUser.updateMany({
    where: {
      role: 'USER',
    },
    data: {
      role: 'CLIENT',
    },
  });
  console.log(`Updated ${updatedAuth.count} records in Auth Service ContechUser table.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
