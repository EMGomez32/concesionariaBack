import { ICategoriaGastoFijoRepository } from '../../../domain/repositories/ICategoriaGastoFijoRepository';
import { CategoriaGastoFijo } from '../../../domain/entities/CategoriaGastoFijo';
import prisma from '../prisma';

export class PrismaCategoriaGastoFijoRepository implements ICategoriaGastoFijoRepository {
    async findAll(concesionariaId: number): Promise<CategoriaGastoFijo[]> {
        const results = await prisma.categoriaGastoFijo.findMany({
            where: { concesionariaId },
            orderBy: { nombre: 'asc' }
        });
        return results.map(this.mapToEntity);
    }

    async findById(id: number): Promise<CategoriaGastoFijo | null> {
        const c = await prisma.categoriaGastoFijo.findUnique({ where: { id } });
        return c ? this.mapToEntity(c) : null;
    }

    async create(data: any): Promise<CategoriaGastoFijo> {
        const c = await prisma.categoriaGastoFijo.create({ data });
        return this.mapToEntity(c);
    }

    async update(id: number, data: any): Promise<CategoriaGastoFijo> {
        const c = await prisma.categoriaGastoFijo.update({
            where: { id },
            data,
        });
        return this.mapToEntity(c);
    }

    async delete(id: number): Promise<void> {
        await prisma.categoriaGastoFijo.delete({ where: { id } });
    }

    async countGastosFijos(id: number): Promise<number> {
        return prisma.gastoFijo.count({ where: { categoriaId: id } });
    }

    private mapToEntity(c: any): CategoriaGastoFijo {
        return new CategoriaGastoFijo(c.id, c.concesionariaId, c.nombre, c.createdAt, c.updatedAt, c.deletedAt);
    }
}
