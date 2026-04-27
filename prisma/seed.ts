import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Seed mínimo del sistema:
 *   - Roles del sistema
 *   - Plan Free
 *   - Concesionaria Demo + sucursal + admin/super-admin demo
 *
 * Las contraseñas demo se leen de env vars (con defaults sólo para
 * desarrollo). NO commitear contraseñas reales acá. En producción,
 * setear:
 *   SEED_ADMIN_PASSWORD, SEED_SUPER_PASSWORD
 */
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'changeme-admin-DEV';
const SEED_SUPER_PASSWORD = process.env.SEED_SUPER_PASSWORD || 'changeme-super-DEV';

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({
    connectionString: connectionString.replace('prisma+postgres://', 'postgres://'),
    max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('Iniciando seed...');

    // Bypass RLS para el seed.
    await prisma.$executeRawUnsafe(`SELECT set_config('app.is_super_admin', 'true', false)`);

    // 1. Roles del sistema
    const roles = ['admin', 'vendedor', 'cobrador', 'postventa', 'lectura', 'super_admin'];
    for (const nombre of roles) {
        await prisma.rol.upsert({
            where: { nombre: nombre as any },
            update: {},
            create: { nombre: nombre as any },
        });
    }
    console.log('✓ Roles creados.');

    // 2. Plan por defecto
    const planFree = await prisma.plan.upsert({
        where: { nombre: 'Free' },
        update: {},
        create: {
            nombre: 'Free',
            precio: 0,
            moneda: 'ARS',
            maxUsuarios: 5,
            maxSucursales: 1,
            maxVehiculos: 50,
        },
    });
    console.log('✓ Plan Free creado.');

    // 3. Concesionaria Demo
    const existingDemo = await prisma.concesionaria.findFirst({
        where: { nombre: 'Concesionaria Demo' },
        include: { sucursales: true },
    });

    const concesionaria = existingDemo ?? await prisma.concesionaria.create({
        data: {
            nombre: 'Concesionaria Demo',
            cuit: '20-12345678-9',
            email: 'demo@concesionaria.com',
            subscription: {
                create: { planId: planFree.id, status: 'active' },
            },
            sucursales: {
                create: { nombre: 'Sucursal Central', direccion: 'Av. Libertador 1234' },
            },
        },
        include: { sucursales: true },
    });
    console.log(existingDemo ? '✓ Concesionaria Demo ya existía.' : '✓ Concesionaria Demo creada.');

    // 4. Admin Demo
    const adminRole = await prisma.rol.findUnique({ where: { nombre: 'admin' } });
    if (adminRole) {
        const hashAdmin = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
        await prisma.usuario.upsert({
            where: { concesionariaId_email: { concesionariaId: concesionaria.id, email: 'admin@demo.com' } },
            update: { emailVerificado: true, estado: 'activo' },
            create: {
                nombre: 'Admin Demo',
                email: 'admin@demo.com',
                passwordHash: hashAdmin,
                concesionariaId: concesionaria.id,
                sucursalId: concesionaria.sucursales[0].id,
                emailVerificado: true,
                estado: 'activo',
                roles: { create: { rolId: adminRole.id } },
            },
        });
        console.log(`✓ Usuario Admin demo: admin@demo.com (password de SEED_ADMIN_PASSWORD)`);
    }

    // 5. Super Admin Demo
    const superRole = await prisma.rol.findUnique({ where: { nombre: 'super_admin' } });
    if (superRole) {
        const hashSuper = await bcrypt.hash(SEED_SUPER_PASSWORD, 10);
        await prisma.usuario.upsert({
            where: { concesionariaId_email: { concesionariaId: concesionaria.id, email: 'superadmin@demo.com' } },
            update: { emailVerificado: true, estado: 'activo' },
            create: {
                nombre: 'Super Admin',
                email: 'superadmin@demo.com',
                passwordHash: hashSuper,
                concesionariaId: concesionaria.id,
                emailVerificado: true,
                estado: 'activo',
                roles: { create: { rolId: superRole.id } },
            },
        });
        console.log(`✓ Usuario Super Admin demo: superadmin@demo.com (password de SEED_SUPER_PASSWORD)`);
    }

    console.log('\nSeed finalizado.');
    if (SEED_ADMIN_PASSWORD.includes('changeme') || SEED_SUPER_PASSWORD.includes('changeme')) {
        console.warn('\n⚠ ATENCIÓN: estás usando passwords de desarrollo por default.');
        console.warn('   En producción, setear SEED_ADMIN_PASSWORD y SEED_SUPER_PASSWORD.');
    }
}

main()
    .catch((e) => {
        console.error('Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
