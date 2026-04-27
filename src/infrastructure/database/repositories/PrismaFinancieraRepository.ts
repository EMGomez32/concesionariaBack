import { IFinancieraRepository } from '../../../domain/repositories/IFinancieraRepository';
import { Financiera } from '../../../domain/entities/Financiera';
import prisma from '../prisma';

export class PrismaFinancieraRepository implements IFinancieraRepository {
    async findAll(concesionariaId: number): Promise<Financiera[]> {
        const results = await prisma.financiera.findMany({
            where: { concesionariaId },
            orderBy: { nombre: 'asc' }
        });
        return results.map(this.mapToEntity);
    }

    async findById(id: number): Promise<Financiera | null> {
        const f = await prisma.financiera.findUnique({ where: { id } });
        return f ? this.mapToEntity(f) : null;
    }

    async create(data: any): Promise<Financiera> {
        const f = await prisma.financiera.create({ data });
        return this.mapToEntity(f);
    }

    async update(id: number, data: any): Promise<Financiera> {
        const f = await prisma.financiera.update({
            where: { id },
            data,
        });
        return this.mapToEntity(f);
    }

    async delete(id: number): Promise<void> {
        await prisma.financiera.delete({ where: { id } });
    }

    async countSolicitudes(id: number): Promise<number> {
        return prisma.solicitudFinanciacion.count({ where: { financieraId: id } });
    }

    private mapToEntity(f: any): Financiera {
        return new Financiera(
            f.id,
            f.concesionariaId,
            f.nombre,
            f.descripcion,
            f.contacto,
            f.telefono,
            f.email,
            f.direccion,
            f.activo,
            f.createdAt,
            f.updatedAt,
            f.deletedAt
        );
    }
}
