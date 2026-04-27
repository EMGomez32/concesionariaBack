import { IReservaRepository } from '../../../domain/repositories/IReservaRepository';
import { NotFoundException } from '../../../domain/exceptions/BaseException';
import prisma from '../../../infrastructure/database/prisma';
import { context } from '../../../infrastructure/security/context';
import { assertValidTransition } from '../../../domain/services/stateMachine';

export class UpdateReserva {
    constructor(private readonly reservaRepository: IReservaRepository) { }

    async execute(id: number, data: any) {
        const current: any = await this.reservaRepository.findById(id);
        if (!current) throw new NotFoundException('Reserva');

        if (data.estado && data.estado !== current.estado) {
            assertValidTransition('reserva', current.estado, data.estado);
        }

        const user = context.getUser();

        return prisma.$transaction(async (tx) => {
            const updated = await tx.reserva.update({
                where: { id },
                data,
            });

            const liberaVehiculo =
                (data.estado === 'cancelada' || data.estado === 'vencida') &&
                current.estado === 'activa';

            if (liberaVehiculo) {
                await tx.vehiculo.update({
                    where: { id: current.vehiculoId },
                    data: { estado: 'publicado' },
                });

                await tx.vehiculoMovimiento.create({
                    data: {
                        concesionariaId: current.concesionariaId,
                        vehiculoId: current.vehiculoId,
                        tipo: 'liberacion_reserva',
                        motivo: `Reserva #${id} pasó a ${data.estado}`,
                        registradoPorId: user?.userId ?? null,
                    },
                });
            }

            return updated;
        });
    }
}
