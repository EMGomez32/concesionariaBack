import { ISolicitudFinanciacionRepository } from '../../../domain/repositories/ISolicitudFinanciacionRepository';
import { SolicitudFinanciacion } from '../../../domain/entities/SolicitudFinanciacion';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaSolicitudFinanciacionRepository implements ISolicitudFinanciacionRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<SolicitudFinanciacion>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.solicitudFinanciacion.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                cliente: true,
                financiera: true
            }
        });

        const total = await prisma.solicitudFinanciacion.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<SolicitudFinanciacion | null> {
        const s = await prisma.solicitudFinanciacion.findUnique({
            where: { id },
            include: { cliente: true, financiera: true }
        });
        return s ? this.mapToEntity(s) : null;
    }

    async create(data: any): Promise<SolicitudFinanciacion> {
        // Schema default for estado is 'borrador'. The state machine for
        // solicitudFinanciacion enforces transitions starting from 'borrador',
        // so we let the DB default win unless the caller explicitly overrides.
        const s = await prisma.solicitudFinanciacion.create({ data });
        return this.mapToEntity(s);
    }

    async update(id: number, data: any): Promise<SolicitudFinanciacion> {
        const s = await prisma.solicitudFinanciacion.update({
            where: { id },
            data,
        });
        return this.mapToEntity(s);
    }

    async delete(id: number): Promise<void> {
        await prisma.solicitudFinanciacion.delete({ where: { id } });
    }

    private mapToEntity(s: any): SolicitudFinanciacion {
        return new SolicitudFinanciacion(
            s.id,
            s.concesionariaId,
            s.clienteId,
            s.financieraId,
            Number(s.monto),
            s.cuotas,
            s.estado,
            s.observaciones,
            s.createdAt,
            s.updatedAt,
            s.deletedAt,
            s.cliente,
            s.financiera
        );
    }
}
