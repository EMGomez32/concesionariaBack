import { Prisma, VersionVehiculo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getVersiones = async (
    filter: Prisma.VersionVehiculoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<VersionVehiculo>> => {
    const { limit = 50, page = 1, sortBy = 'nombre', sortOrder = 'asc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const where: Prisma.VersionVehiculoWhereInput = { ...filter, deletedAt: null };

    const results = await prisma.versionVehiculo.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            modelo: {
                select: {
                    id: true,
                    nombre: true,
                    marca: { select: { id: true, nombre: true } },
                },
            },
        },
    });

    const total = await prisma.versionVehiculo.count({ where });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getVersionById = async (id: number) => {
    const version = await prisma.versionVehiculo.findUnique({
        where: { id },
        include: {
            modelo: {
                select: {
                    id: true,
                    nombre: true,
                    marca: { select: { id: true, nombre: true } },
                },
            },
        },
    });
    if (!version || version.deletedAt) throw new ApiError(404, 'Versión no encontrada', 'NOT_FOUND');
    return version;
};

export const createVersion = async (data: Prisma.VersionVehiculoUncheckedCreateInput) => {
    const modelo = await prisma.modelo.findUnique({ where: { id: data.modeloId } });
    if (!modelo || modelo.deletedAt) throw new ApiError(404, 'Modelo no encontrado', 'NOT_FOUND');
    if (modelo.concesionariaId !== data.concesionariaId) {
        throw new ApiError(400, 'El modelo no pertenece a la misma concesionaria', 'INVALID_TENANT');
    }
    const existing = await prisma.versionVehiculo.findFirst({
        where: {
            modeloId: data.modeloId,
            nombre: data.nombre,
            anio: data.anio ?? null,
            deletedAt: null,
        },
    });
    if (existing) throw new ApiError(409, 'Ya existe una versión con ese nombre y año en el modelo', 'CONFLICT');
    return prisma.versionVehiculo.create({
        data,
        include: {
            modelo: {
                select: {
                    id: true,
                    nombre: true,
                    marca: { select: { id: true, nombre: true } },
                },
            },
        },
    });
};

export const updateVersion = async (id: number, data: Prisma.VersionVehiculoUpdateInput) => {
    await getVersionById(id);
    return prisma.versionVehiculo.update({
        where: { id },
        data,
        include: {
            modelo: {
                select: {
                    id: true,
                    nombre: true,
                    marca: { select: { id: true, nombre: true } },
                },
            },
        },
    });
};

export const deleteVersion = async (id: number) => {
    await getVersionById(id);
    return prisma.versionVehiculo.update({ where: { id }, data: { deletedAt: new Date() } });
};
