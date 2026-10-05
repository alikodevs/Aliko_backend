const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log(
    'Starting data migration: USER -> CLIENT in ConTechRole (Con-Tech Backend)',
  );

  // Update ContechProfile in Con-Tech Backend
  const updatedContech = await prisma.contechProfile.updateMany({
    where: {
      role: 'USER',
    },
    data: {
      role: 'CLIENT',
    },
  });
  console.log(
    `Updated ${updatedContech.count} records in Con-Tech Backend ContechProfile table.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
