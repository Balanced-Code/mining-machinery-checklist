import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const inspecciones = await prisma.inspeccion.findMany({
    take: 5,
    orderBy: { fechaInicio: 'desc' },
    include: {
      maquina: true,
    },
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
