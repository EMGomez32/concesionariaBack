import { PrismaClient } from '@prisma/client';
import { context } from '../security/context';

// Models that store tenant-scoped data. The extension:
//   - filters reads by `deletedAt: null`
//   - rewrites `delete`/`deleteMany` as soft updates of `deletedAt`
//   - injects `concesionariaId` on create/where for non super_admin
//   - wraps every operation in a transaction that sets `app.tenant_id`
//     and `app.is_super_admin`, so Postgres RLS policies see the right
//     context for the row.
// Lista de modelos con soft-delete. DEBE coincidir EXACTAMENTE con los
// nombres de modelo en `schema.prisma` (la extensión los matchea por nombre).
//
// Antes había un fantasma: `PresupuestoCanjeVehiculo` que NO existe en el
// schema (el real se llama `PresupuestoCanje`). Resultado: borrar un canje
// hacía hard-delete porque no matcheaba la lista. Fixeado.
const SOFT_DELETE_MODELS = [
    'Concesionaria',
    'Sucursal',
    'Usuario',
    'Cliente',
    'Proveedor',
    'Vehiculo',
    'VehiculoArchivo',
    'IngresoVehiculo',
    'VehiculoMovimiento',
    'Reserva',
    'Presupuesto',
    'PresupuestoItem',
    'PresupuestoExtra',
    'PresupuestoCanje',
    'Venta',
    'VentaPago',
    'VentaExtra',
    'VentaCanjeVehiculo',
    'Financiacion',
    'Cuota',
    'PagoCuota',
    'GastoVehiculo',
    'CategoriaGastoVehiculo',
    'GastoFijo',
    'CategoriaGastoFijo',
    'Financiera',
    'SolicitudFinanciacion',
    'SolicitudFinanciacionArchivo',
    'PostventaCaso',
    'PostventaItem',
    'Caja',
    'MovimientoCaja',
    'CierreCaja',
    'Marca',
    'Modelo',
    'VersionVehiculo',
];

// Models without `concesionaria_id`. They skip RLS wrapping AND tenant
// injection. AuditLog has `concesionaria_id` but we treat it as tenant-scoped
// (RLS applies). The other globals (Rol, Plan, RefreshToken, Concesionaria
// itself) skip RLS.
const GLOBAL_MODELS = ['Concesionaria', 'Rol', 'Plan', 'RefreshToken'];

const isSoftDeleteModel = (model: string) =>
    SOFT_DELETE_MODELS.some((m) => m.toLowerCase() === model.toLowerCase());

const isGlobalModel = (model: string) =>
    GLOBAL_MODELS.some((m) => m.toLowerCase() === model.toLowerCase());

const accessor = (model: string) =>
    model.charAt(0).toLowerCase() + model.slice(1);

export const extendedPrisma = (prisma: PrismaClient) => {
    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const tenantId = context.getTenantId();
                    const userContext = context.getUser();
                    const castArgs = args as any;
                    const isSuperAdmin = userContext?.roles?.includes('super_admin') || false;
                    const tenantScoped = !isGlobalModel(model);

                    // Soft-delete read filter
                    if (isSoftDeleteModel(model)) {
                        if (['findFirst', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                            castArgs.where = castArgs.where || {};
                            if (castArgs.where.deletedAt === undefined) {
                                castArgs.where.deletedAt = null;
                            }
                        }
                    }

                    // Tenant injection (skip for super_admin and global models)
                    if (tenantId && tenantScoped && !isSuperAdmin) {
                        if (['findFirst', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                            castArgs.where = { ...castArgs.where, concesionariaId: tenantId };
                        }
                        if (operation === 'create') {
                            castArgs.data = { ...castArgs.data, concesionariaId: tenantId };
                        }
                        if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
                            castArgs.where = { ...castArgs.where, concesionariaId: tenantId };
                            if (operation === 'upsert') {
                                castArgs.create = { ...castArgs.create, concesionariaId: tenantId };
                            }
                        }
                    }

                    // Soft-delete intercept: rewrite delete/deleteMany as updates of deletedAt.
                    let effectiveOp: string = operation;
                    if (isSoftDeleteModel(model)) {
                        if (operation === 'delete') {
                            effectiveOp = 'update';
                            castArgs.data = { deletedAt: new Date() };
                        } else if (operation === 'deleteMany') {
                            effectiveOp = 'updateMany';
                            castArgs.data = { deletedAt: new Date() };
                        }
                    }

                    // Tenant-scoped: wrap in a transaction that sets the RLS
                    // session vars. Uses the raw `prisma` (closure) so the
                    // inner call doesn't re-enter this extension.
                    if (tenantScoped) {
                        return prisma.$transaction(async (tx) => {
                            await tx.$executeRawUnsafe(
                                `SELECT set_config('app.tenant_id', $1, true)`,
                                tenantId ? String(tenantId) : ''
                            );
                            await tx.$executeRawUnsafe(
                                `SELECT set_config('app.is_super_admin', $1, true)`,
                                isSuperAdmin ? 'true' : 'false'
                            );
                            return (tx as any)[accessor(model)][effectiveOp](castArgs);
                        });
                    }

                    // Global model — no RLS, but honor the soft-delete rewrite.
                    if (effectiveOp !== operation) {
                        return (prisma as any)[accessor(model)][effectiveOp](castArgs);
                    }
                    return query(castArgs);
                },
            },
        },
    });
};
