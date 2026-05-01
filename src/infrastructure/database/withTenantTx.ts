import { rawPrisma } from './prisma';
import { context } from '../security/context';
import type { Prisma } from '@prisma/client';

/**
 * Helper para operaciones multi-statement que necesitan respetar RLS.
 *
 * Problema: la extensión Prisma (`prisma.extension.ts`) abre UNA transacción
 * por cada operación para setear `app.tenant_id`. Cuando un service abre
 * `prisma.$transaction(...)` con varias operaciones adentro, terminamos con
 * transacciones anidadas — cada operación interna abre su propia tx con
 * `set_config`. Eso es:
 *   - Lento (roundtrips innecesarios para los GUCs)
 *   - Confuso (la tx "externa" no comparte sesión con las internas)
 *
 * Solución: `withTenantTx(fn)` abre UNA sola transacción, setea los GUCs UNA
 * vez al inicio, y le pasa a tu fn el `tx` "crudo" para usarlo en todas las
 * operaciones del flow. RLS aplica con el contexto correcto en toda la tx.
 *
 * Uso:
 *   import { withTenantTx } from '../../infrastructure/database/withTenantTx';
 *
 *   export const createVenta = (data: CreateVentaInput) =>
 *       withTenantTx(async (tx) => {
 *           const vehiculo = await tx.vehiculo.findUnique({ where: { id: data.vehiculoId } });
 *           // ... más operaciones — todas bajo el mismo tenantId/RLS
 *           return tx.venta.create({ data: ... });
 *       });
 *
 * Importante: usa `rawPrisma` (sin la extensión) porque la extensión
 * volvería a abrir tx por operación. Acá inyectamos manualmente el
 * `concesionariaId` en queries que lo requieran (o confiamos en RLS).
 */

type TxClient = Omit<
    Prisma.TransactionClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const withTenantTx = async <T>(
    fn: (tx: TxClient) => Promise<T>,
): Promise<T> => {
    const tenantId = context.getTenantId();
    const isSuperAdmin = !!context.getUser()?.roles?.includes('super_admin');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rawPrisma as any).$transaction(async (tx: TxClient) => {
        // Setear GUCs una vez al inicio de la tx. Los `true` (3er param)
        // hacen que la config sea local a esta transacción — al commitear
        // o rollback, vuelven al default.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).$executeRawUnsafe(
            `SELECT set_config('app.tenant_id', $1, true)`,
            tenantId ? String(tenantId) : '',
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).$executeRawUnsafe(
            `SELECT set_config('app.is_super_admin', $1, true)`,
            isSuperAdmin ? 'true' : 'false',
        );

        return fn(tx);
    });
};
