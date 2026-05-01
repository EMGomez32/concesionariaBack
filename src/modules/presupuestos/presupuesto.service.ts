import { Prisma, Presupuesto } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';
import { createVenta } from '../ventas/venta.service';

export const getPresupuestos = async (
    filter: Prisma.PresupuestoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Presupuesto>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.presupuesto.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            vendedor: { select: { nombre: true, email: true } },
            items: true
        }
    });

    const total = await prisma.presupuesto.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getPresupuestoById = async (id: number) => {
    const result = await prisma.presupuesto.findUnique({
        where: { id },
        include: {
            cliente: true,
            items: true,
            extras: true,
            canje: true,
            vendedor: true
        }
    });
    if (!result) throw new ApiError(404, 'Presupuesto no encontrado');
    return result;
};

export const createPresupuesto = async (data: any) => {
    const { items, externos, canjes, canje, ...presupuestoData } = data;

    const canjeData = canjes || canje; // Handle both arrays / single from data

    return prisma.presupuesto.create({
        data: {
            ...presupuestoData,
            estado: 'borrador',
            items: {
                create: items || []
            },
            extras: {
                create: externos || []
            },
            ...(canjeData ? { canje: { create: canjeData } } : {})
        },
        include: {
            items: true,
            extras: true,
            canje: true
        }
    });
};

export const updatePresupuesto = async (id: number, data: Prisma.PresupuestoUpdateInput) => {
    await getPresupuestoById(id);
    return prisma.presupuesto.update({
        where: { id },
        data
    });
};

export const deletePresupuesto = async (id: number) => {
    await getPresupuestoById(id);
    return prisma.presupuesto.delete({ where: { id } });
};

/**
 * HU-60: total del presupuesto. Migrado de interface (Sprint 4 cont).
 */
export const getPresupuestoTotal = async (id: number) => {
    const [items, extras, canje] = await Promise.all([
        prisma.presupuestoItem.aggregate({
            where: { presupuestoId: id },
            _sum: { precioFinal: true },
        }),
        prisma.presupuestoExtra.aggregate({
            where: { presupuestoId: id },
            _sum: { monto: true },
        }),
        prisma.presupuestoCanje.findUnique({
            where: { presupuestoId: id },
            select: { valorTomado: true },
        }),
    ]);
    const subtotalItems = Number(items._sum.precioFinal ?? 0);
    const subtotalExtras = Number(extras._sum.monto ?? 0);
    const valorCanje = Number(canje?.valorTomado ?? 0);
    return {
        presupuestoId: id,
        subtotalItems,
        subtotalExtras,
        valorCanje,
        total: subtotalItems + subtotalExtras - valorCanje,
    };
};

/**
 * Convertir presupuesto aceptado en venta. Reusa modules/ventas/createVenta
 * (con SELECT FOR UPDATE atómico). Migrado de
 * application/use-cases/presupuestos/ConvertPresupuestoToVenta.
 */
export const convertirEnVenta = async (presupuestoId: number, body: any) => {
    const presupuesto = await getPresupuestoById(presupuestoId);

    if (presupuesto.estado !== 'aceptado') {
        throw new ApiError(
            422,
            `El presupuesto debe estar en estado 'aceptado' para convertirse en venta (actual: '${presupuesto.estado}')`,
            'INVALID_STATE',
        );
    }

    const primerItem = presupuesto.items?.[0];
    if (!primerItem) {
        throw new ApiError(400, 'El presupuesto no tiene ítems', 'VALIDATION_ERROR');
    }

    const ventaData = {
        sucursalId: body.sucursalId ?? presupuesto.sucursalId,
        clienteId: presupuesto.clienteId,
        vendedorId: body.vendedorId ?? presupuesto.vendedorId,
        vehiculoId: primerItem.vehiculoId,
        presupuestoId: presupuesto.id,
        precioVenta:
            body.precioVenta ?? Number(primerItem.precioFinal ?? primerItem.precioLista),
        moneda: body.moneda ?? presupuesto.moneda ?? 'ARS',
        formaPago: body.formaPago ?? 'contado',
        fechaVenta: body.fechaVenta ?? new Date().toISOString(),
        observaciones: body.observaciones,
        pagos: body.pagos,
        externos: body.externos,
        canjes: body.canjes,
    };

    return createVenta(ventaData);
};
