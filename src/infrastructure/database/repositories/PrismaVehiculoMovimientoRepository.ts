import { IVehiculoMovimientoRepository } from '../../../domain/repositories/IVehiculoMovimientoRepository';
import { VehiculoMovimiento } from '../../../domain/entities/VehiculoMovimiento';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';
import { BaseException, NotFoundException } from '../../../domain/exceptions/BaseException';

export class PrismaVehiculoMovimientoRepository implements IVehiculoMovimientoRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<VehiculoMovimiento>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.vehiculoMovimiento.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                vehiculo: true,
                desdeSucursal: true,
                hastaSucursal: true,
                registradoPor: { select: { nombre: true, email: true } }
            }
        });

        const total = await prisma.vehiculoMovimiento.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<VehiculoMovimiento | null> {
        const m = await prisma.vehiculoMovimiento.findUnique({
            where: { id },
            include: {
                vehiculo: true,
                desdeSucursal: true,
                hastaSucursal: true,
                registradoPor: { select: { nombre: true, email: true } }
            }
        });
        return m ? this.mapToEntity(m) : null;
    }

    async create(data: any): Promise<VehiculoMovimiento> {
        const { vehiculoId, hastaSucursalId, registradoPorId, motivo } = data;

        const v = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
        if (!v) throw new NotFoundException('Vehículo');

        const desdeSucursalId = v.sucursalId;
        if (desdeSucursalId === hastaSucursalId) {
            throw new BaseException(400, 'La sucursal de destino debe ser diferente a la de origen', 'SAME_SUCURSAL');
        }

        return prisma.$transaction(async (tx) => {
            const m = await tx.vehiculoMovimiento.create({
                data: {
                    vehiculoId,
                    desdeSucursalId,
                    hastaSucursalId,
                    registradoPorId,
                    tipo: 'traslado',
                    motivo,
                    concesionariaId: v.concesionariaId
                }
            });

            await tx.vehiculo.update({
                where: { id: vehiculoId },
                data: { sucursalId: hastaSucursalId }
            });

            return this.mapToEntity(m);
        });
    }

    private mapToEntity(m: any): VehiculoMovimiento {
        return new VehiculoMovimiento(
            m.id,
            m.concesionariaId,
            m.vehiculoId,
            m.registradoPorId,
            m.desdeSucursalId,
            m.hastaSucursalId,
            m.tipo,
            m.fecha,
            m.motivo,
            m.createdAt,
            m.updatedAt,
            m.deletedAt,
            m.vehiculo,
            m.desdeSucursal,
            m.hastaSucursal,
            m.registradoPor
        );
    }
}
