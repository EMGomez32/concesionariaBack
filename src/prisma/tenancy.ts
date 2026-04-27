import { Prisma } from '@prisma/client';
import { context } from '../infrastructure/security/context';

export const tenancyExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const userContext = context.getUser();
                    
                    if (model === 'Sucursal') {
                        console.log('🔧 Tenancy Extension - Model:', model, 'Operation:', operation);
                        console.log('🔧 User Context:', userContext);
                    }

                    // Si no hay contexto o es super_admin, no filtramos nada
                    if (!userContext || userContext.roles.includes('super_admin')) {
                        if (model === 'Sucursal') {
                            console.log('✅ Bypassing tenancy filter (super_admin or no context)');
                        }
                        return query(args);
                    }

                    const tenantId = userContext.concesionariaId;
                    
                    if (model === 'Sucursal') {
                        console.log('🔧 Tenant ID:', tenantId);
                        console.log('🔧 Args before:', JSON.stringify(args));
                    }

                    // Lista de modelos que TIENEN campo concesionariaId
                    // En este proyecto, casi todos tienen concesionariaId.
                    // Si el modelo tiene el campo, inyectamos el filtro.
                    const modelsWithTenancy = [
                        'Sucursal', 'Usuario', 'Cliente', 'Proveedor', 'Vehiculo',
                        'IngresoVehiculo', 'VehiculoMovimiento', 'Reserva',
                        'CategoriaGastoVehiculo', 'GastoVehiculo', 'CategoriaGastoFijo',
                        'GastoFijo', 'Presupuesto', 'Venta', 'Financiacion',
                        'Financiera', 'SolicitudFinanciacion', 'PostventaCaso',
                        'AuditLog', 'ConcesionariaSubscription'
                    ];

                    if (modelsWithTenancy.includes(model as string)) {
                        const a = args as any;
                        if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                            a.where = { ...a.where, concesionariaId: tenantId };
                        }

                        // Para creación, forzamos el tenantId
                        if (['create', 'createMany'].includes(operation)) {
                            if (operation === 'create') {
                                a.data = { ...a.data, concesionariaId: tenantId };
                            } else if (operation === 'createMany') {
                                if (Array.isArray(a.data)) {
                                    a.data = a.data.map((item: any) => ({ ...item, concesionariaId: tenantId }));
                                }
                            }
                        }

                        // Para actualización y borrado, aseguramos que pertenezca al tenant
                        if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
                            a.where = { ...a.where, concesionariaId: tenantId };
                        }
                        
                        if (model === 'Sucursal') {
                            console.log('🔧 Args after tenancy filter:', JSON.stringify(args));
                        }
                    }

                    const result = await query(args);
                    
                    if (model === 'Sucursal' && operation === 'findMany') {
                        console.log('📊 Query result count:', Array.isArray(result) ? result.length : 'not an array');
                    }
                    
                    return result;
                },
            },
        },
    });
});
