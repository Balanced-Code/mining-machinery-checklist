import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Limpiar datos existentes (opcional, comentar si no deseas eliminar)
  // await prisma.usuario.deleteMany();
  // await prisma.cargo.deleteMany();
  // await prisma.maquina.deleteMany();

  // Crear cargos (niveles más altos = mayor jerarquía)

  const cargoInvitado = await prisma.cargo.create({
    data: {
      nombre: 'Invitado',
      nivel: 1,
      creadoPor: null,
    },
  });

  const cargoOperador = await prisma.cargo.create({
    data: {
      nombre: 'Operador',
      nivel: 1,
      creadoPor: null,
    },
  });

  const cargoTecnicoMecanico = await prisma.cargo.create({
    data: {
      nombre: 'Tecnico Mecanico',
      nivel: 2,
      creadoPor: null,
    },
  });

  const cargoSupervisor = await prisma.cargo.create({
    data: {
      nombre: 'Supervisor',
      nivel: 2,
      creadoPor: null,
    },
  });

  const cargoInspector = await prisma.cargo.create({
    data: {
      nombre: 'Inspector',
      nivel: 3,
      creadoPor: null,
    },
  });

  const cargoAdmin = await prisma.cargo.create({
    data: {
      nombre: 'Administrador',
      nivel: 4,
      creadoPor: null,
    },
  });

  // Crear usuarios

  const hashedPassword = await bcrypt.hash('Admin123?', 10);

  const adminUser = await prisma.usuario.create({
    data: {
      nombre: 'Administrador Sistema',
      correo: 'admin@normet.com',
      cargoId: cargoAdmin.id,
      contrasena: hashedPassword,
    },
  });

  const supervisorUser = await prisma.usuario.create({
    data: {
      nombre: 'Juan Pérez',
      correo: 'supervisor@normet.com',
      cargoId: cargoSupervisor.id,
      contrasena: hashedPassword,
    },
  });

  const operadorUser = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Martinez',
      correo: 'operador@normet.com',
      cargoId: cargoOperador.id,
      contrasena: hashedPassword,
    },
  });

  const tecnicoUser = await prisma.usuario.create({
    data: {
      nombre: 'María González',
      correo: 'tecnico@normet.com',
      cargoId: cargoTecnicoMecanico.id,
      contrasena: hashedPassword,
    },
  });

  const inspectorUser = await prisma.usuario.create({
    data: {
      nombre: 'Roberto Silva',
      correo: 'inspector@normet.com',
      cargoId: cargoInspector.id,
      contrasena: hashedPassword,
    },
  });

  const invitadoUser = await prisma.usuario.create({
    data: {
      nombre: 'Invitado General',
      correo: 'invitado@normet.com',
      cargoId: cargoInvitado.id,
      contrasena: hashedPassword,
    },
  });

  // Actualizar cargos con el creador
  await prisma.cargo.updateMany({
    where: { creadoPor: null },
    data: { creadoPor: adminUser.id },
  });

  // Crear algunas máquinas de ejemplo

  const maquinas = await Promise.all([
    prisma.maquina.create({
      data: {
        nombre: 'Excavadora CAT 320',
        creadoPor: adminUser.id,
      },
    }),
    prisma.maquina.create({
      data: {
        nombre: 'Cargador Frontal Volvo L120',
        creadoPor: adminUser.id,
      },
    }),
    prisma.maquina.create({
      data: {
        nombre: 'Perforadora Atlas Copco',
        creadoPor: adminUser.id,
      },
    }),
  ]);

  // Crear roles de asignación

  const rolInspectorPrincipal = await prisma.rolAsignacion.create({
    data: {
      nombre: 'Inspector Principal',
      creadoPor: adminUser.id,
    },
  });

  const rolTecnico = await prisma.rolAsignacion.create({
    data: {
      nombre: 'Técnico',
      creadoPor: adminUser.id,
    },
  });

  const rolSupervisor = await prisma.rolAsignacion.create({
    data: {
      nombre: 'Supervisor',
      creadoPor: adminUser.id,
    },
  });

  // Crear templates de ejemplo basados en los mocks del frontend

  await Promise.all([
    // Checklist 1
    prisma.template.create({
      data: {
        nombre: 'Checklist 1',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre:
                'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Presión de neumáticos correcta.',
              orden: 2,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Estado de luces y señalización.',
              orden: 3,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 2
    prisma.template.create({
      data: {
        nombre: 'Checklist 2',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre:
                'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Sistema de frenos operativo.',
              orden: 2,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Cinturones de seguridad en buen estado.',
              orden: 3,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Espejos retrovisores ajustados.',
              orden: 4,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 3
    prisma.template.create({
      data: {
        nombre: 'Checklist 3',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre: 'Inspección visual del motor.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Verificación de sistema eléctrico.',
              orden: 2,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Estado de mangueras y conexiones.',
              orden: 3,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 4
    prisma.template.create({
      data: {
        nombre: 'Checklist 4',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre:
                'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Revisión de batería y conexiones.',
              orden: 2,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Estado de correas y tensores.',
              orden: 3,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Funcionamiento de sistema de refrigeración.',
              orden: 4,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Verificación de filtros de aire y combustible.',
              orden: 5,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 5
    prisma.template.create({
      data: {
        nombre: 'Checklist 5',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre: 'Inspección de estructura y chasis.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Estado de suspensión y amortiguadores.',
              orden: 2,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Verificación de sistema de escape.',
              orden: 3,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 6
    prisma.template.create({
      data: {
        nombre: 'Checklist 6',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre: 'Revisión de documentación del vehículo.',
              orden: 1,
              creadoPor: adminUser.id,
            },
            {
              nombre: 'Kit de emergencia completo.',
              orden: 2,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),

    // Checklist 7
    prisma.template.create({
      data: {
        nombre: 'Checklist 7',
        creadoPor: adminUser.id,
        secciones: {
          create: [
            {
              nombre: 'Verificación de sistema hidráulico.',
              orden: 1,
              creadoPor: adminUser.id,
            },
          ],
        },
      },
    }),
  ]);

  console.log(
    `     • Nivel 2: Supervisor (ID: ${cargoSupervisor.id}), Técnico Mecánico (ID: ${cargoTecnicoMecanico.id})`
  );
  console.log(
    `     • Nivel 1: Operador (ID: ${cargoOperador.id}), Invitado (ID: ${cargoInvitado.id})`
  );

  console.log(
    `     • ID ${rolInspectorPrincipal.id}: Inspector Principal (solo 1 por inspección)`
  );

  console.log(
    `     • ID ${rolSupervisor.id}: Supervisor (solo 1 por inspección)`
  );
}

main()
  .catch(e => {
    console.error('ror durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
