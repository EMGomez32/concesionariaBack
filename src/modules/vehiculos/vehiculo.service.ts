import { Prisma, Vehiculo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

const CATALOG_INCLUDE = {
    marcaCatalogo: { select: { id: true, nombre: true } },
    modeloCatalogo: { select: { id: true, nombre: true } },
    versionCatalogo: { select: { id: true, nombre: true, anio: true, precioSugerido: true } },
} as const;

export const getVehiculos = async (
    filter: Prisma.VehiculoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Vehiculo>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    // Listado: select explícito (más liviano que include).
    // No traemos archivos en el listado — se cargan en el detalle.
    // Solo nombre de sucursal y de catálogo, no los objetos completos.
    const results = await prisma.vehiculo.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
            id: true, concesionariaId: true, sucursalId: true,
            tipo: true, origen: true, marca: true, modelo: true, version: true,
            marcaId: true, modeloId: true, versionVehiculoId: true,
            anio: true, dominio: true, vin: true, kmIngreso: true, color: true,
            estado: true, fechaIngreso: true, precioLista: true, precioCompra: true,
            createdAt: true, updatedAt: true,
            sucursal: { select: { id: true, nombre: true } },
            marcaCatalogo: { select: { id: true, nombre: true } },
            modeloCatalogo: { select: { id: true, nombre: true } },
        },
    }) as unknown as Vehiculo[];

    const total = await prisma.vehiculo.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getVehiculoById = async (id: number) => {
    const vehiculo = await prisma.vehiculo.findUnique({
        where: { id },
        include: {
            sucursal: true,
            archivos: true,
            movimientos: {
                include: {
                    desdeSucursal: true,
                    hastaSucursal: true
                }
            },
            ...CATALOG_INCLUDE,
        }
    });
    if (!vehiculo) {
        throw new ApiError(404, 'Vehículo no encontrado', 'NOT_FOUND');
    }
    return vehiculo;
};

/**
 * Validates that the catalog FKs (marca/modelo/versionVehiculo) belong to the
 * same concesionaria as the vehicle, and that the modelo belongs to the marca,
 * and the version belongs to the modelo.
 */
const validateCatalogFks = async (
    concesionariaId: number,
    marcaId?: number | null,
    modeloId?: number | null,
    versionVehiculoId?: number | null,
) => {
    if (marcaId != null) {
        const marca = await prisma.marca.findUnique({ where: { id: marcaId } });
        if (!marca || marca.deletedAt) throw new ApiError(404, 'Marca no encontrada', 'NOT_FOUND');
        if (marca.concesionariaId !== concesionariaId) {
            throw new ApiError(400, 'La marca no pertenece a la misma concesionaria', 'INVALID_TENANT');
        }
    }
    if (modeloId != null) {
        const modelo = await prisma.modelo.findUnique({ where: { id: modeloId } });
        if (!modelo || modelo.deletedAt) throw new ApiError(404, 'Modelo no encontrado', 'NOT_FOUND');
        if (modelo.concesionariaId !== concesionariaId) {
            throw new ApiError(400, 'El modelo no pertenece a la misma concesionaria', 'INVALID_TENANT');
        }
        if (marcaId != null && modelo.marcaId !== marcaId) {
            throw new ApiError(400, 'El modelo no pertenece a la marca seleccionada', 'INVALID_RELATION');
        }
    }
    if (versionVehiculoId != null) {
        const version = await prisma.versionVehiculo.findUnique({ where: { id: versionVehiculoId } });
        if (!version || version.deletedAt) throw new ApiError(404, 'Versión no encontrada', 'NOT_FOUND');
        if (version.concesionariaId !== concesionariaId) {
            throw new ApiError(400, 'La versión no pertenece a la misma concesionaria', 'INVALID_TENANT');
        }
        if (modeloId != null && version.modeloId !== modeloId) {
            throw new ApiError(400, 'La versión no pertenece al modelo seleccionado', 'INVALID_RELATION');
        }
    }
};

export const createVehiculo = async (data: Prisma.VehiculoUncheckedCreateInput) => {
    await validateCatalogFks(
        data.concesionariaId,
        data.marcaId ?? null,
        data.modeloId ?? null,
        data.versionVehiculoId ?? null,
    );
    return prisma.vehiculo.create({ data, include: CATALOG_INCLUDE });
};

export const updateVehiculo = async (id: number, data: Prisma.VehiculoUncheckedUpdateInput) => {
    const current = await getVehiculoById(id);

    // Resolve final values for FK validation (incoming or current)
    const resolveId = (incoming: unknown, fallback: number | null): number | null => {
        if (incoming === undefined) return fallback;
        if (incoming === null) return null;
        return Number(incoming);
    };
    const finalMarcaId = resolveId(data.marcaId, current.marcaId);
    const finalModeloId = resolveId(data.modeloId, current.modeloId);
    const finalVersionId = resolveId(data.versionVehiculoId, current.versionVehiculoId);
    await validateCatalogFks(current.concesionariaId, finalMarcaId, finalModeloId, finalVersionId);

    return prisma.vehiculo.update({
        where: { id },
        data,
        include: CATALOG_INCLUDE,
    });
};

export const deleteVehiculo = async (id: number) => {
    await getVehiculoById(id);

    // No permitir borrar si tiene ventas asociadas
    const hasVentas = await prisma.venta.count({ where: { vehiculoId: id } });
    if (hasVentas > 0) {
        throw new ApiError(400, 'No se puede eliminar el vehículo porque tiene ventas asociadas', 'HAS_RELATIONS');
    }

    // No permitir borrar si tiene reservas activas
    const hasReservas = await prisma.reserva.count({ where: { vehiculoId: id, estado: 'activa' } });
    if (hasReservas > 0) {
        throw new ApiError(400, 'No se puede eliminar el vehículo porque tiene una reserva activa', 'HAS_RELATIONS');
    }

    return prisma.vehiculo.delete({
        where: { id },
    });
};

/**
 * Transferir vehículo de una sucursal a otra (mismo tenant).
 * Migrado desde application/use-cases/vehiculos/TransferVehiculo.ts.
 * Crea un VehiculoMovimiento de tipo "traslado" en la misma tx.
 */
export const transferirVehiculo = async (
    vehiculoId: number,
    sucursalDestinoId: number,
    motivo?: string,
) => {
    if (!sucursalDestinoId) {
        throw new ApiError(400, 'sucursalDestinoId es obligatorio', 'VALIDATION_ERROR');
    }

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) throw new ApiError(404, 'Vehículo no encontrado', 'NOT_FOUND');

    if (vehiculo.sucursalId === sucursalDestinoId) {
        throw new ApiError(400, 'El vehículo ya está en la sucursal destino', 'INVALID_VALUE');
    }

    const sucursalDestino = await prisma.sucursal.findUnique({
        where: { id: sucursalDestinoId },
    });
    if (!sucursalDestino) {
        throw new ApiError(404, 'Sucursal destino no encontrada', 'NOT_FOUND');
    }
    if (sucursalDestino.concesionariaId !== vehiculo.concesionariaId) {
        throw new ApiError(
            400,
            'La sucursal destino pertenece a otra concesionaria',
            'INVALID_VALUE',
        );
    }

    const desdeSucursalId = vehiculo.sucursalId;

    return prisma.$transaction(async (tx) => {
        const updated = await tx.vehiculo.update({
            where: { id: vehiculoId },
            data: { sucursalId: sucursalDestinoId },
        });

        await tx.vehiculoMovimiento.create({
            data: {
                concesionariaId: vehiculo.concesionariaId,
                vehiculoId,
                desdeSucursalId,
                hastaSucursalId: sucursalDestinoId,
                tipo: 'traslado',
                motivo: motivo ?? 'Traslado entre sucursales',
            },
        });

        return updated;
    });
};
