import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../../domain/entities/AuditLog';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaAuditLogRepository implements IAuditLogRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<AuditLog>> {
        const limit = Number(options.limit) || 50;
        const page = Number(options.page) || 1;
        const sortBy = (options.sortBy as string) || 'createdAt';
        const sortOrder = options.sortOrder || 'desc';

        const results = await prisma.auditLog.findMany({
            where: filter,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                usuario: { select: { nombre: true, email: true } }
            }
        });

        const total = await prisma.auditLog.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<AuditLog | null> {
        const a = await prisma.auditLog.findUnique({
            where: { id },
            include: { usuario: { select: { nombre: true, email: true } } }
        });
        return a ? this.mapToEntity(a) : null;
    }

    async create(data: any): Promise<AuditLog> {
        const a = await prisma.auditLog.create({ data });
        return this.mapToEntity(a);
    }

    private mapToEntity(a: any): AuditLog {
        return new AuditLog(
            a.id,
            a.concesionariaId,
            a.usuarioId,
            a.entidad,
            a.entidadId,
            a.accion,
            a.detalle,
            a.ip,
            a.userAgent,
            a.createdAt,
            a.usuario
        );
    }
}
