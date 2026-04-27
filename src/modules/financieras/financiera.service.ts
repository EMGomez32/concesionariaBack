import { Prisma, Financiera } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';

export const getFinancieras = async (concesionariaId: number): Promise<Financiera[]> => {
    return prisma.financiera.findMany({
        where: { concesionariaId },
        orderBy: { nombre: 'asc' }
    });
};

export const createFinanciera = async (data: Prisma.FinancieraUncheckedCreateInput): Promise<Financiera> => {
    return prisma.financiera.create({ data });
};

export const updateFinanciera = async (id: number, data: Prisma.FinancieraUpdateInput): Promise<Financiera> => {
    return prisma.financiera.update({
        where: { id },
        data
    });
};

export const deleteFinanciera = async (id: number): Promise<Financiera> => {
    const hasSolicitudes = await prisma.solicitudFinanciacion.count({ where: { financieraId: id } });
    if (hasSolicitudes > 0) {
        throw new ApiError(400, 'No se puede eliminar la financiera porque tiene solicitudes asociadas', 'HAS_RELATIONS');
    }
    return prisma.financiera.delete({ where: { id } });
};
