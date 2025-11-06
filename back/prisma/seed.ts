import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (opcional, comentar si no deseas eliminar)
  // await prisma.usuario.deleteMany();
  // await prisma.cargo.deleteMany();
  // await prisma.maquina.deleteMany();

  // Crear cargos (niveles más altos = mayor jerarquía)
  console.log('📋 Creando cargos...');
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
  console.log('👤 Creando usuarios...');
  const hashedPassword = await bcrypt.hash('admin123?', 10);

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
  console.log('🚜 Creando máquinas...');
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
  console.log('👷 Creando roles de asignación...');
  await Promise.all([
    prisma.rolAsignacion.create({
      data: {
        nombre: 'Inspector Principal',
        creadoPor: adminUser.id,
      },
    }),
    prisma.rolAsignacion.create({
      data: {
        nombre: 'Inspector Asistente',
        creadoPor: adminUser.id,
      },
    }),
    prisma.rolAsignacion.create({
      data: {
        nombre: 'Supervisor',
        creadoPor: adminUser.id,
      },
    }),
  ]);

  // Crear un template de ejemplo
  console.log('📝 Creando template de inspección...');
  await prisma.template.create({
    data: {
      nombre: 'REVISIÓN PUESTA EN MARCHA, REGULACIONES Y MOVIMIENTOS',
      creadoPor: adminUser.id,
      secciones: {
        create: [
          {
            nombre: 'Puesta en marcha (primer arranque)',
            orden: 1,
            creadoPor: adminUser.id,
          },
          {
            nombre: 'Verificación de niveles de fluidos',
            orden: 2,
            creadoPor: adminUser.id,
          },
          {
            nombre: 'Revisión de sistema hidráulico',
            orden: 3,
            creadoPor: adminUser.id,
          },
          {
            nombre: 'Prueba de movimientos básicos',
            orden: 4,
            creadoPor: adminUser.id,
          },
          {
            nombre: 'Verificación de sistema eléctrico',
            orden: 5,
            creadoPor: adminUser.id,
          },
        ],
      },
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('\n📊 Datos creados:');
  console.log(`   - 6 Cargos:`);
  console.log(`     • Nivel 4: Administrador (ID: ${cargoAdmin.id})`);
  console.log(`     • Nivel 3: Inspector (ID: ${cargoInspector.id})`);
  console.log(
    `     • Nivel 2: Supervisor (ID: ${cargoSupervisor.id}), Técnico Mecánico (ID: ${cargoTecnicoMecanico.id})`
  );
  console.log(
    `     • Nivel 1: Operador (ID: ${cargoOperador.id}), Invitado (ID: ${cargoInvitado.id})`
  );
  console.log(`   - 6 Usuarios:`);
  console.log(`     • Administrador (Nivel 4): ${adminUser.correo}`);
  console.log(`     • Inspector (Nivel 3): ${inspectorUser.correo}`);
  console.log(`     • Técnico Mecánico (Nivel 2): ${tecnicoUser.correo}`);
  console.log(`     • Supervisor (Nivel 2): ${supervisorUser.correo}`);
  console.log(`     • Operador (Nivel 1): ${operadorUser.correo}`);
  console.log(`     • Invitado (Nivel 1): ${invitadoUser.correo}`);
  console.log(`   - ${maquinas.length} Máquinas`);
  console.log(`   - 3 Roles de asignación`);
  console.log(`   - 1 Template con 5 secciones`);
  console.log(
    '\n🔐 Credenciales de acceso (todos tienen la misma contraseña):'
  );
  console.log('   Password: admin123');
}

main()
  .catch(e => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
