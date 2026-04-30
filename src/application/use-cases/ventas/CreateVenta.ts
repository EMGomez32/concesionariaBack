import { IVentaRepository } from '../../../domain/repositories/IVentaRepository';
import { IVehiculoRepository } from '../../../domain/repositories/IVehiculoRepository';
import { BaseException, NotFoundException } from '../../../domain/exceptions/BaseException';
import prisma from '../../../infrastructure/database/prisma';

interface VehiculoLockRow {
    id: number;
    estado: string;
    concesionaria_id: number;
}

export class CreateVenta {
    constructor(
        private readonly ventaRepository: IVentaRepository,
        private readonly vehiculoRepository: IVehiculoRepository
    ) { }

    async execute(data: any) {
        const { externos, pagos, canjes, reservaId, presupuestoId, ...ventaData } = data;

        // Toda la operación dentro de una transacción con lock pesimista
        // sobre el vehículo. Antes el chequeo `if (estado === 'vendido')`
        // estaba fuera de la transacción → TOCTOU: dos requests concurrentes
        // ambos pasaban el check, ambos creaban venta, ambos marcaban vendido.
        // Resultado: doble venta del mismo VIN.
        //
        // SELECT ... FOR UPDATE bloquea la fila hasta que la tx commitee. El
        // segundo request espera, y cuando lee ve estado='vendido' → falla.
        return prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRawUnsafe<VehiculoLockRow[]>(
                `SELECT id, estado::text AS estado, concesionaria_id
                 FROM vehiculos
                 WHERE id = $1 AND deleted_at IS NULL
                 FOR UPDATE`,
                ventaData.vehiculoId
            );

            if (rows.length === 0) throw new NotFoundException('Vehículo');
            const lockedVehiculo = rows[0];
            if (lockedVehiculo.estado === 'vendido') {
                throw new BaseException(400, 'El vehículo ya está vendido', 'VEHICULO_VENDIDO');
            }

            // 1. Crear venta. El concesionariaId se hereda del vehículo
            // (multi-tenancy: una venta vive en el tenant del vehículo).
            const venta = await tx.venta.create({
                data: {
                    ...ventaData,
                    concesionariaId: lockedVehiculo.concesionaria_id,
                    presupuestoId,
                    extras: { create: externos || [] },
                    pagos: { create: pagos || [] },
                    canjes: { create: canjes || [] }
                }
            });

            // 2. Marcar vehículo como vendido (la fila ya está bloqueada).
            await tx.vehiculo.update({
                where: { id: ventaData.vehiculoId },
                data: { estado: 'vendido' }
            });

            // 3. Marcar reserva como convertida si existe
            if (reservaId) {
                await tx.reserva.update({
                    where: { id: reservaId },
                    data: { estado: 'convertida_en_venta' }
                });
            }

            // 4. Aceptar presupuesto si existe
            if (presupuestoId) {
                await tx.presupuesto.update({
                    where: { id: presupuestoId },
                    data: { estado: 'aceptado' }
                });
            }

            return venta;
        });
    }
}
