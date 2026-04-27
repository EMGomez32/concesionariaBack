import { Prisma, CategoriaGastoVehiculo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';

export const getCategorias = async (concesionariaId: number): Promise<CategoriaGastoVehiculo[]> => {
    return prisma.categoriaGastoVehiculo.findMany({
        where: { concesionariaId },
        orderBy: { nombre: 'asc' }
    });
};

export const createCategoria = async (data: Prisma.CategoriaGastoVehiculoUncheckedCreateInput): Promise<CategoriaGastoVehiculo> => {
    return prisma.categoriaGastoVehiculo.create({ data });
};

export const updateCategoria = async (id: number, data: Prisma.CategoriaGastoVehiculoUpdateInput): Promise<CategoriaGastoVehiculo> => {
    return prisma.categoriaGastoVehiculo.update({
        where: { id },
        data
    });
};

export const deleteCategoria = async (id: number): Promise<CategoriaGastoVehiculo> => {
    // Verificar si tiene gastos asociados
    const hasGastos = await prisma.gastoVehiculo.count({ where: { categoriaId: id } });
    if (hasGastos > 0) {
        throw new ApiError(400, 'No se puede eliminar la categoría porque tiene gastos asociados', 'HAS_RELATIONS');
    }
    return prisma.categoriaGastoVehiculo.delete({ where: { id } });
};
