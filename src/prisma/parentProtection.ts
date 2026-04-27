import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';

export const parentProtectionExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        name: 'parentProtection',
        query: {
            $allModels: {
                async update({ model, args, query }) {
                    // Si estamos haciendo un "delete lógico" (seteando deletedAt)
                    const data = args.data as any;
                    if (data && 'deletedAt' in data && data.deletedAt !== null && data.deletedAt !== undefined) {
                        await checkChildren(model, args.where, client);
                    }
                    return query(args);
                },
            },
        },
    });
});

async function checkChildren(model: string, where: any, client: any) {
    // Obtenemos el registro que se quiere borrar para tener su ID
    const record = await client[model].findUnique({ where });
    if (!record) return;

    const id = record.id;

    // Mapa de dependencias: Modelo Padre -> [ { modeloHijo, campoFK } ]
    const dependencies: Record<string, { model: string; field: string }[]> = {
        Concesionaria: [
            { model: 'sucursal', field: 'concesionariaId' },
            { model: 'usuario', field: 'concesionariaId' },
            { model: 'vehiculo', field: 'concesionariaId' },
        ],
        Sucursal: [
            { model: 'usuario', field: 'sucursalId' },
            { model: 'vehiculo', field: 'sucursalId' },
        ],
        Vehiculo: [
            { model: 'venta', field: 'vehiculoId' },
            { model: 'reserva', field: 'vehiculoId' },
        ],
        Cliente: [
            { model: 'venta', field: 'clienteId' },
            { model: 'presupuesto', field: 'clienteId' },
        ],
        // ... añadir más según sea necesario
    };

    const modelDeps = dependencies[model];
    if (!modelDeps) return;

    for (const dep of modelDeps) {
        // Obtenemos el "where" básico
        const whereClause: any = { [dep.field]: id };

        // Solo agregamos deletedAt: null si el modelo lo soporta.
        // Como no tenemos fácil acceso a los metadatos de Prisma aquí, 
        // usamos un try-catch o una lista conocida. 
        // Optamos por try-catch para ser resilientes.
        try {
            const count = await client[dep.model].count({
                where: { ...whereClause, deletedAt: null }
            });
            if (count > 0) {
                throw new ApiError(400, `No se puede eliminar el registro porque tiene ${dep.model} activos vinculados.`, 'PARENT_HAS_CHILDREN');
            }
        } catch (e: any) {
            // Si el error es que deletedAt no existe, intentamos sin él
            if (e.code === 'P2025' || e.message?.includes('deletedAt')) {
                const count = await client[dep.model].count({ where: whereClause });
                if (count > 0) {
                    throw new ApiError(400, `No se puede eliminar el registro porque tiene ${dep.model} vinculados.`, 'PARENT_HAS_CHILDREN');
                }
            } else {
                throw e;
            }
        }
    }
}
