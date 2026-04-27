import { Prisma, Marca } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getMarcas = async (
    filter: Prisma.MarcaWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Marca>> => {
    const { limit = 50, page = 1, sortBy = 'nombre', sortOrder = 'asc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const where: Prisma.MarcaWhereInput = { ...filter, deletedAt: null };

    const results = await prisma.marca.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            _count: { select: { modelos: { where: { deletedAt: null } } } },
        },
    });

    const total = await prisma.marca.count({ where });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getMarcaById = async (id: number) => {
    const marca = await prisma.marca.findUnique({ where: { id } });
    if (!marca || marca.deletedAt) throw new ApiError(404, 'Marca no encontrada', 'NOT_FOUND');
    return marca;
};

export const createMarca = async (data: Prisma.MarcaUncheckedCreateInput) => {
    const existing = await prisma.marca.findFirst({
        where: { concesionariaId: data.concesionariaId, nombre: data.nombre, deletedAt: null },
    });
    if (existing) throw new ApiError(409, 'Ya existe una marca con ese nombre', 'CONFLICT');
    return prisma.marca.create({ data });
};

export const updateMarca = async (id: number, data: Prisma.MarcaUpdateInput) => {
    await getMarcaById(id);
    return prisma.marca.update({ where: { id }, data });
};

export const deleteMarca = async (id: number) => {
    await getMarcaById(id);
    const modelosActivos = await prisma.modelo.count({ where: { marcaId: id, deletedAt: null } });
    if (modelosActivos > 0) {
        throw new ApiError(400, 'No se puede eliminar la marca porque tiene modelos asociados', 'HAS_RELATIONS');
    }
    return prisma.marca.update({ where: { id }, data: { deletedAt: new Date() } });
};
