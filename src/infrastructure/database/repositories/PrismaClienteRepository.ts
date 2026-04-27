import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaClienteRepository implements IClienteRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Cliente>> {
        const limit = Number(options.limit) || 20;
        const page = Number(options.page) || 1;
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder || 'desc';

        // Build where clause with contains for text fields
        const whereClause: any = {};
        
        if (filter.nombre) {
            whereClause.nombre = { contains: filter.nombre, mode: 'insensitive' };
        }
        if (filter.apellido) {
            whereClause.apellido = { contains: filter.apellido, mode: 'insensitive' };
        }
        if (filter.email) {
            whereClause.email = { contains: filter.email, mode: 'insensitive' };
        }
        if (filter.telefono) {
            whereClause.telefono = { contains: filter.telefono };
        }
        if (filter.dni) {
            whereClause.dni = { contains: filter.dni };
        }
        if (filter.concesionariaId !== undefined) {
            whereClause.concesionariaId = filter.concesionariaId;
        }

        const results = await prisma.cliente.findMany({
            where: whereClause,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                concesionaria: {
                    select: {
                        id: true,
                        nombre: true
                    }
                }
            }
        });

        const total = await prisma.cliente.count({ where: whereClause });

        return {
            results: results.map(this.mapToEntity),
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Cliente | null> {
        const c = await prisma.cliente.findUnique({ 
            where: { id },
            include: {
                concesionaria: {
                    select: {
                        id: true,
                        nombre: true
                    }
                }
            }
        });
        return c ? this.mapToEntity(c) : null;
    }

    async create(data: any): Promise<Cliente> {
        const c = await prisma.cliente.create({ data });
        return this.mapToEntity(c);
    }

    async update(id: number, data: any): Promise<Cliente> {
        const c = await prisma.cliente.update({
            where: { id },
            data,
        });
        return this.mapToEntity(c);
    }

    async delete(id: number): Promise<void> {
        await prisma.cliente.delete({ where: { id } });
    }

    async countVentas(id: number): Promise<number> {
        return prisma.venta.count({ where: { clienteId: id } });
    }

    async countPresupuestos(id: number): Promise<number> {
        return prisma.presupuesto.count({ where: { clienteId: id } });
    }

    private mapToEntity(c: any): Cliente {
        return new Cliente(
            c.id,
            c.concesionariaId,
            c.nombre,
            c.dni,
            c.telefono,
            c.email,
            c.direccion,
            c.observaciones,
            c.createdAt,
            c.updatedAt,
            c.deletedAt,
            c.concesionaria ? { id: c.concesionaria.id, nombre: c.concesionaria.nombre } : undefined
        );
    }
}
