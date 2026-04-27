import { Prisma, PostventaItem } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';

export const getItemsByCaso = async (casoId: number): Promise<PostventaItem[]> => {
    return prisma.postventaItem.findMany({
        where: { casoId },
        orderBy: { createdAt: 'asc' }
    });
};

export const createItem = async (data: Prisma.PostventaItemUncheckedCreateInput): Promise<PostventaItem> => {
    return prisma.postventaItem.create({ data });
};

export const deleteItem = async (id: number): Promise<PostventaItem> => {
    return prisma.postventaItem.delete({ where: { id } });
};
