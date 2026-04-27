import { Prisma, CategoriaGastoFijo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';

export const getCategorias = async (concesionariaId: number): Promise<CategoriaGastoFijo[]> => {
    return prisma.categoriaGastoFijo.findMany({
        where: { concesionariaId },
        orderBy: { nombre: 'asc' }
    });
};

export const getCategoriaById = async (id: number): Promise<CategoriaGastoFijo> => {
    const result = await prisma.categoriaGastoFijo.findUnique({ where: { id } });
    if (!result) throw new ApiError(404, 'Categoría no encontrada');
    return result;
};

export const createCategoria = async (data: Prisma.CategoriaGastoFijoUncheckedCreateInput): Promise<CategoriaGastoFijo> => {
    return prisma.categoriaGastoFijo.create({ data });
};

export const updateCategoria = async (id: number, data: Prisma.CategoriaGastoFijoUpdateInput): Promise<CategoriaGastoFijo> => {
    return prisma.categoriaGastoFijo.update({
        where: { id },
        data
    });
};

export const deleteCategoria = async (id: number): Promise<CategoriaGastoFijo> => {
    const hasGastos = await prisma.gastoFijo.count({ where: { categoriaId: id } });
    if (hasGastos > 0) {
        throw new ApiError(400, 'No se puede eliminar la categoría porque tiene gastos fijos asociados', 'HAS_RELATIONS');
    }
    return prisma.categoriaGastoFijo.delete({ where: { id } });
};
