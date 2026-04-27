import { Prisma, VehiculoArchivo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';

export const getArchivosByVehiculo = async (vehiculoId: number): Promise<VehiculoArchivo[]> => {
    return prisma.vehiculoArchivo.findMany({
        where: { vehiculoId }
    });
};

export const createArchivo = async (data: Prisma.VehiculoArchivoUncheckedCreateInput): Promise<VehiculoArchivo> => {
    return prisma.vehiculoArchivo.create({ data });
};

export const deleteArchivo = async (id: number): Promise<VehiculoArchivo> => {
    const archivo = await prisma.vehiculoArchivo.findUnique({ where: { id } });
    if (!archivo) throw new ApiError(404, 'Archivo no encontrado');
    return prisma.vehiculoArchivo.delete({ where: { id } });
};
