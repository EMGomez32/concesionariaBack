/**
 * init-rls.js
 *
 * Idempotent migration que:
 *   1. Backfillea `concesionaria_id` en tablas hijas que se denormalizaron
 *      al habilitar Postgres Row Level Security.
 *   2. Habilita RLS + FORCE RLS en cada tabla tenant-scoped.
 *   3. (Re)crea la policy `tenant_iso` que permite acceso solo cuando:
 *        - row's concesionaria_id matchea `current_setting('app.tenant_id')`
 *        - O bien la request marcó `current_setting('app.is_super_admin') = 'true'`
 *
 * Corre cada vez que arranca el backend. Todos los statements usan IF EXISTS
 * / DROP POLICY IF EXISTS para que el re-run sea idempotente.
 *
 * Pure JavaScript — no necesita ts-node ni @types/pg en runtime.
 */
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = (process.env.DATABASE_URL || '').replace('prisma+postgres://', 'postgres://');

// Tablas tenant-scoped que deben enforcear isolation.
const TENANT_TABLES = [
    'sucursales',
    'usuarios',
    'clientes',
    'proveedores',
    'vehiculos',
    'vehiculo_archivos',
    'ingresos_vehiculo',
    'vehiculo_movimientos',
    'reservas',
    'categorias_gasto_vehiculo',
    'gastos_vehiculo',
    'categorias_gasto_fijo',
    'gastos_fijos',
    'presupuestos',
    'presupuesto_items',
    'presupuesto_extras',
    'presupuesto_canje',
    'ventas',
    'venta_extras',
    'venta_pagos',
    'venta_canje_vehiculo',
    'financiaciones',
    'cuotas',
    'pagos_cuota',
    'financieras',
    'solicitudes_financiacion',
    'solicitud_financiacion_archivos',
    'postventa_casos',
    'postventa_items',
    'audit_log',
    'concesionaria_subscriptions',
    'invoices',
    'payments',
    'cajas',
    'movimientos_caja',
    'cierres_caja',
    'marcas',
    'modelos',
    'versiones_vehiculo',
];

// Sub-resources que necesitan concesionaria_id backfilleado desde el padre.
const BACKFILL_PLAN = [
    { table: 'vehiculo_archivos', fk: 'vehiculo_id', parentTable: 'vehiculos', parentKey: 'id',
      backfillSql: `UPDATE vehiculo_archivos c SET concesionaria_id = p.concesionaria_id FROM vehiculos p WHERE c.vehiculo_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'presupuesto_items', fk: 'presupuesto_id', parentTable: 'presupuestos', parentKey: 'id',
      backfillSql: `UPDATE presupuesto_items c SET concesionaria_id = p.concesionaria_id FROM presupuestos p WHERE c.presupuesto_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'presupuesto_extras', fk: 'presupuesto_id', parentTable: 'presupuestos', parentKey: 'id',
      backfillSql: `UPDATE presupuesto_extras c SET concesionaria_id = p.concesionaria_id FROM presupuestos p WHERE c.presupuesto_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'presupuesto_canje', fk: 'presupuesto_id', parentTable: 'presupuestos', parentKey: 'id',
      backfillSql: `UPDATE presupuesto_canje c SET concesionaria_id = p.concesionaria_id FROM presupuestos p WHERE c.presupuesto_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'venta_extras', fk: 'venta_id', parentTable: 'ventas', parentKey: 'id',
      backfillSql: `UPDATE venta_extras c SET concesionaria_id = p.concesionaria_id FROM ventas p WHERE c.venta_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'venta_pagos', fk: 'venta_id', parentTable: 'ventas', parentKey: 'id',
      backfillSql: `UPDATE venta_pagos c SET concesionaria_id = p.concesionaria_id FROM ventas p WHERE c.venta_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'venta_canje_vehiculo', fk: 'venta_id', parentTable: 'ventas', parentKey: 'id',
      backfillSql: `UPDATE venta_canje_vehiculo c SET concesionaria_id = p.concesionaria_id FROM ventas p WHERE c.venta_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'cuotas', fk: 'financiacion_id', parentTable: 'financiaciones', parentKey: 'id',
      backfillSql: `UPDATE cuotas c SET concesionaria_id = p.concesionaria_id FROM financiaciones p WHERE c.financiacion_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'pagos_cuota', fk: 'cuota_id', parentTable: 'cuotas', parentKey: 'id',
      backfillSql: `UPDATE pagos_cuota c SET concesionaria_id = q.concesionaria_id FROM cuotas q WHERE c.cuota_id = q.id AND c.concesionaria_id IS NULL;` },
    { table: 'solicitud_financiacion_archivos', fk: 'solicitud_id', parentTable: 'solicitudes_financiacion', parentKey: 'id',
      backfillSql: `UPDATE solicitud_financiacion_archivos c SET concesionaria_id = p.concesionaria_id FROM solicitudes_financiacion p WHERE c.solicitud_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'postventa_items', fk: 'caso_id', parentTable: 'postventa_casos', parentKey: 'id',
      backfillSql: `UPDATE postventa_items c SET concesionaria_id = p.concesionaria_id FROM postventa_casos p WHERE c.caso_id = p.id AND c.concesionaria_id IS NULL;` },
    { table: 'invoices', fk: 'subscription_id', parentTable: 'concesionaria_subscriptions', parentKey: 'id',
      backfillSql: `UPDATE invoices c SET concesionaria_id = s.concesionaria_id FROM concesionaria_subscriptions s WHERE c.subscription_id = s.id AND c.concesionaria_id IS NULL;` },
    { table: 'payments', fk: 'invoice_id', parentTable: 'invoices', parentKey: 'id',
      backfillSql: `UPDATE payments c SET concesionaria_id = i.concesionaria_id FROM invoices i WHERE c.invoice_id = i.id AND c.concesionaria_id IS NULL;` },
];

async function tableExists(client, table) {
    const res = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
    );
    return res.rowCount > 0;
}

async function columnExists(client, table, column) {
    const res = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column]
    );
    return res.rowCount > 0;
}

async function main() {
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
        console.log('[init-rls] starting…');

        // Backfill phase: solo para tablas que ya existen.
        for (const { table, backfillSql } of BACKFILL_PLAN) {
            if (!(await tableExists(client, table))) {
                console.log(`[init-rls] skip backfill for ${table} (tabla aún no existe)`);
                continue;
            }
            if (!(await columnExists(client, table, 'concesionaria_id'))) {
                console.log(`[init-rls] skip backfill for ${table} (column no presente todavía)`);
                continue;
            }
            const r = await client.query(backfillSql);
            if (r.rowCount && r.rowCount > 0) {
                console.log(`[init-rls] backfilled ${r.rowCount} row(s) on ${table}`);
            }
        }

        // BEFORE INSERT triggers que derivan concesionaria_id del padre
        // cuando la app no lo seteó (caso: super_admin creando sub-resources).
        for (const { table, fk, parentTable, parentKey } of BACKFILL_PLAN) {
            if (!(await tableExists(client, table))) continue;
            if (!(await tableExists(client, parentTable))) continue;
            if (!(await columnExists(client, table, 'concesionaria_id'))) continue;

            const fnName = `derive_concesionaria_${table}`;
            const trgName = `trg_${table}_derive_concesionaria`;

            await client.query(`
                CREATE OR REPLACE FUNCTION ${fnName}() RETURNS TRIGGER AS $$
                BEGIN
                    IF NEW.concesionaria_id IS NULL THEN
                        SELECT concesionaria_id INTO NEW.concesionaria_id
                        FROM ${parentTable}
                        WHERE ${parentKey} = NEW.${fk};
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            await client.query(`DROP TRIGGER IF EXISTS ${trgName} ON ${table};`);
            await client.query(`
                CREATE TRIGGER ${trgName}
                BEFORE INSERT ON ${table}
                FOR EACH ROW EXECUTE FUNCTION ${fnName}();
            `);
        }

        // RLS enablement + policies.
        for (const table of TENANT_TABLES) {
            if (!(await tableExists(client, table))) continue;
            if (!(await columnExists(client, table, 'concesionaria_id'))) {
                console.log(`[init-rls] skip RLS for ${table} (no concesionaria_id column yet)`);
                continue;
            }

            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
            await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
            await client.query(`DROP POLICY IF EXISTS tenant_iso ON ${table};`);
            await client.query(
                `CREATE POLICY tenant_iso ON ${table}
                 USING (
                     current_setting('app.is_super_admin', true) = 'true'
                     OR concesionaria_id = NULLIF(current_setting('app.tenant_id', true), '')::int
                 )
                 WITH CHECK (
                     current_setting('app.is_super_admin', true) = 'true'
                     OR concesionaria_id = NULLIF(current_setting('app.tenant_id', true), '')::int
                 );`
            );
        }

        console.log('[init-rls] done.');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((e) => {
    console.error('[init-rls] failed:', e);
    process.exit(1);
});
