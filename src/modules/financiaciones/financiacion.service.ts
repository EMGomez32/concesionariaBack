import { Prisma, Financiacion } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getFinanciaciones = async (
    filter: Prisma.FinanciacionWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Financiacion>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.financiacion.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            venta: { include: { vehiculo: true } },
            cuotasPlan: true
        }
    }) as any;

    const total = await prisma.financiacion.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createFinanciacion = async (data: any) => {
    const { ventaId, clienteId, cobradorId, montoFinanciado, cuotas: cuotasCount, diaVencimiento, fechaInicio, concesionariaId } = data;

    const montoCuota = parseFloat(montoFinanciado) / parseInt(cuotasCount, 10);

    return prisma.$transaction(async (tx) => {
        const financiacion = await tx.financiacion.create({
            data: {
                ventaId,
                clienteId,
                cobradorId,
                montoFinanciado,
                cuotas: cuotasCount,
                diaVencimiento,
                fechaInicio: new Date(fechaInicio),
                concesionariaId
            }
        });

        const cuotasData = [];
        for (let i = 1; i <= cuotasCount; i++) {
            const fechaVence = new Date(fechaInicio);
            fechaVence.setMonth(fechaVence.getMonth() + i);
            fechaVence.setDate(diaVencimiento);

            cuotasData.push({
                financiacionId: financiacion.id,
                nroCuota: i,
                montoCuota: montoCuota,
                saldoCuota: montoCuota,
                vencimiento: fechaVence,
                estado: 'pendiente' as any
            });
        }

        await tx.cuota.createMany({ data: cuotasData });

        return tx.financiacion.findUnique({
            where: { id: financiacion.id },
            include: { cuotasPlan: true }
        });
    });
};

export const registrarPagoCuota = async (cuotaId: number, data: { monto: number; metodo: string; fechaPago?: string }) => {
    return prisma.$transaction(async (tx) => {
        const cuota = await tx.cuota.findUnique({ where: { id: cuotaId } });
        if (!cuota) throw new ApiError(404, 'Cuota no encontrada');

        const saldoRestante = Number(cuota.saldoCuota) - Number(data.monto);
        const nuevoEstado = saldoRestante <= 0 ? 'pagada' : 'parcial';

        await tx.pagoCuota.create({
            data: {
                cuotaId,
                monto: data.monto,
                metodo: data.metodo as any,
                fechaPago: data.fechaPago ? new Date(data.fechaPago) : new Date()
            }
        });

        return tx.cuota.update({
            where: { id: cuotaId },
            data: {
                estado: nuevoEstado as any,
                saldoCuota: Math.max(0, saldoRestante)
            }
        });
    });
};

export const getFinanciacionById = async (id: number) => {
    const result = await prisma.financiacion.findUnique({
        where: { id },
        include: { cuotasPlan: true, venta: true }
    });
    if (!result) throw new ApiError(404, 'Financiación no encontrada');
    return result;
};
