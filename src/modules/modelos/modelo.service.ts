import { Prisma, Modelo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getModelos = async (
    filter: Prisma.ModeloWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Modelo>> => {
    const { limit = 50, page = 1, sortBy = 'nombre', sortOrder = 'asc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const where: Prisma.ModeloWhereInput = { ...filter, deletedAt: null };

    const results = await prisma.modelo.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            marca: { select: { id: true, nombre: true } },
            _count: { select: { versiones: { where: { deletedAt: null } } } },
        },
    });

    const total = await prisma.modelo.count({ where });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getModeloById = async (id: number) => {
    const modelo = await prisma.modelo.findUnique({
        where: { id },
        include: { marca: { select: { id: true, nombre: true } } },
    });
    if (!modelo || modelo.deletedAt) throw new ApiError(404, 'Modelo no encontrado', 'NOT_FOUND');
    return modelo;
};

export const createModelo = async (data: Prisma.ModeloUncheckedCreateInput) => {
    const marca = await prisma.marca.findUnique({ where: { id: data.marcaId } });
    if (!marca || marca.deletedAt) throw new ApiError(404, 'Marca no encontrada', 'NOT_FOUND');
    if (marca.concesionariaId !== data.concesionariaId) {
        throw new ApiError(400, 'La marca no pertenece a la misma concesionaria', 'INVALID_TENANT');
    }
    const existing = await prisma.modelo.findFirst({
        where: { marcaId: data.marcaId, nombre: data.nombre, deletedAt: null },
    });
    if (existing) throw new ApiError(409, 'Ya existe un modelo con ese nombre en la marca', 'CONFLICT');
    return prisma.modelo.create({
        data,
        include: { marca: { select: { id: true, nombre: true } } },
    });
};

export const updateModelo = async (id: number, data: Prisma.ModeloUpdateInput) => {
    await getModeloById(id);
    return prisma.modelo.update({
        where: { id },
        data,
        include: { marca: { select: { id: true, nombre: true } } },
    });
};

export const deleteModelo = async (id: number) => {
    await getModeloById(id);
    const versionesActivas = await prisma.versionVehiculo.count({ where: { modeloId: id, deletedAt: null } });
    if (versionesActivas > 0) {
        throw new ApiError(400, 'No se puede eliminar el modelo porque tiene versiones asociadas', 'HAS_RELATIONS');
    }
    return prisma.modelo.update({ where: { id }, data: { deletedAt: new Date() } });
};
