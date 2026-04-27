import { IPostventaItemRepository } from '../../../domain/repositories/IPostventaItemRepository';
import { PostventaItem } from '../../../domain/entities/PostventaItem';
import prisma from '../prisma';

export class PrismaPostventaItemRepository implements IPostventaItemRepository {
    async findByCaso(casoId: number): Promise<PostventaItem[]> {
        const results = await prisma.postventaItem.findMany({
            where: { casoId },
            orderBy: { createdAt: 'asc' }
        });
        return results.map(this.mapToEntity);
    }

    async findById(id: number): Promise<PostventaItem | null> {
        const i = await prisma.postventaItem.findUnique({ where: { id } });
        return i ? this.mapToEntity(i) : null;
    }

    async create(data: any): Promise<PostventaItem> {
        const i = await prisma.postventaItem.create({ data });
        return this.mapToEntity(i);
    }

    async delete(id: number): Promise<void> {
        await prisma.postventaItem.delete({ where: { id } });
    }

    private mapToEntity(i: any): PostventaItem {
        return new PostventaItem(i.id, i.casoId, i.descripcion, Number(i.monto), i.cantidad, i.createdAt, i.updatedAt);
    }
}
