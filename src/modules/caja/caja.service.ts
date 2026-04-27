import { Prisma, Caja, CierreCaja, MovimientoCaja } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

/* ──────────────────────── Cajas ──────────────────────── */

export const getCajas = async (filter: Prisma.CajaWhereInput): Promise<Caja[]> => {
    return prisma.caja.findMany({
        where: { ...filter, deletedAt: null },
        orderBy: { id: 'asc' },
    });
};

export const getCajaById = async (id: number) => {
    const caja = await prisma.caja.findUnique({ where: { id } });
    if (!caja || caja.deletedAt) throw new ApiError(404, 'Caja no encontrada', 'NOT_FOUND');
    return caja;
};

export const createCaja = async (data: Prisma.CajaUncheckedCreateInput) => {
    return prisma.caja.create({ data });
};

export const updateCaja = async (id: number, data: Prisma.CajaUpdateInput) => {
    await getCajaById(id);
    return prisma.caja.update({ where: { id }, data });
};

export const deleteCaja = async (id: number) => {
    await getCajaById(id);
    const movs = await prisma.movimientoCaja.count({ where: { cajaId: id, deletedAt: null } });
    const cierres = await prisma.cierreCaja.count({ where: { cajaId: id, deletedAt: null } });
    if (movs > 0 || cierres > 0) {
        throw new ApiError(400, 'No se puede eliminar una caja con movimientos o cierres', 'HAS_RELATIONS');
    }
    return prisma.caja.update({ where: { id }, data: { deletedAt: new Date() } });
};

/**
 * Saldo actual de una caja:
 *  - Si existe al menos un cierre, base = `saldoReal` (si fue auditado) o
 *    `saldoTeorico` del cierre más reciente, MÁS los movimientos posteriores
 *    a la fecha de ese cierre.
 *  - Si no hay cierres, base = 0 + suma de todos los movimientos.
 *
 * Convención: ingreso suma, egreso resta.
 */
export const getSaldoCaja = async (cajaId: number): Promise<number> => {
    const ultimoCierre = await prisma.cierreCaja.findFirst({
        where: { cajaId, deletedAt: null },
        orderBy: { fecha: 'desc' },
    });

    const baseSaldo = ultimoCierre
        ? Number(ultimoCierre.saldoReal ?? ultimoCierre.saldoTeorico)
        : 0;

    // Sumar movimientos posteriores al último cierre (o todos si no hay).
    const fechaCorte = ultimoCierre?.fecha;
    const sql = fechaCorte
        ? `SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0)::text AS delta
           FROM movimientos_caja
           WHERE caja_id = $1 AND deleted_at IS NULL AND fecha > $2`
        : `SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0)::text AS delta
           FROM movimientos_caja
           WHERE caja_id = $1 AND deleted_at IS NULL`;

    const params: unknown[] = fechaCorte ? [cajaId, fechaCorte] : [cajaId];
    const result = await prisma.$queryRawUnsafe<{ delta: string }[]>(sql, ...params);
    const delta = Number(result[0]?.delta ?? 0);
    return baseSaldo + delta;
};

/* ──────────────────────── Movimientos ──────────────────────── */

export const getMovimientos = async (
    filter: Prisma.MovimientoCajaWhereInput,
    options: QueryOptions,
): Promise<PaginatedResponse<MovimientoCaja>> => {
    const { limit = 20, page = 1, sortBy = 'fecha', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const where: Prisma.MovimientoCajaWhereInput = { ...filter, deletedAt: null };

    const results = await prisma.movimientoCaja.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: { caja: { select: { id: true, nombre: true, tipo: true } } },
    });
    const total = await prisma.movimientoCaja.count({ where });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createMovimiento = async (data: Prisma.MovimientoCajaUncheckedCreateInput) => {
    const caja = await getCajaById(data.cajaId);
    if (caja.concesionariaId !== data.concesionariaId) {
        throw new ApiError(400, 'La caja no pertenece a la misma concesionaria', 'INVALID_TENANT');
    }
    return prisma.movimientoCaja.create({ data });
};

export const deleteMovimiento = async (id: number) => {
    const m = await prisma.movimientoCaja.findUnique({ where: { id } });
    if (!m || m.deletedAt) throw new ApiError(404, 'Movimiento no encontrado', 'NOT_FOUND');
    return prisma.movimientoCaja.update({ where: { id }, data: { deletedAt: new Date() } });
};

/* ──────────────────────── Cierres ──────────────────────── */

export const getCierres = async (
    filter: Prisma.CierreCajaWhereInput,
    options: QueryOptions,
): Promise<PaginatedResponse<CierreCaja>> => {
    const { limit = 30, page = 1, sortBy = 'fecha', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const where: Prisma.CierreCajaWhereInput = { ...filter, deletedAt: null };

    const results = await prisma.cierreCaja.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: { caja: { select: { id: true, nombre: true, tipo: true } } },
    });
    const total = await prisma.cierreCaja.count({ where });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

interface CierreInput {
    concesionariaId: number;
    cajaId: number;
    fecha: Date;
    saldoReal?: number | null;
    observaciones?: string | null;
    cerradoPorId?: number | null;
}

/**
 * Cierra el día para una caja. Calcula saldo inicial (= saldo teórico al
 * cierre del día anterior, o 0 si es el primero) + ingresos/egresos del día
 * a partir de los movimientos. Si `saldoReal` viene, calcula la diferencia.
 *
 * Idempotente por (cajaId, fecha): si ya hay un cierre, lo actualiza.
 */
export const cerrarDia = async (input: CierreInput) => {
    const caja = await getCajaById(input.cajaId);
    if (caja.concesionariaId !== input.concesionariaId) {
        throw new ApiError(400, 'La caja no pertenece a la misma concesionaria', 'INVALID_TENANT');
    }

    const fechaSolo = new Date(Date.UTC(
        input.fecha.getUTCFullYear(),
        input.fecha.getUTCMonth(),
        input.fecha.getUTCDate(),
    ));

    // Saldo inicial = saldo teórico del cierre anterior, o 0
    const cierreAnterior = await prisma.cierreCaja.findFirst({
        where: { cajaId: input.cajaId, fecha: { lt: fechaSolo }, deletedAt: null },
        orderBy: { fecha: 'desc' },
    });
    const saldoInicial = Number(cierreAnterior?.saldoTeorico ?? 0);

    // Sumar movimientos del día
    const start = new Date(fechaSolo);
    const end = new Date(fechaSolo);
    end.setUTCDate(end.getUTCDate() + 1);

    const movs = await prisma.movimientoCaja.findMany({
        where: {
            cajaId: input.cajaId,
            fecha: { gte: start, lt: end },
            deletedAt: null,
        },
        select: { tipo: true, monto: true },
    });
    const ingresosDia = movs.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
    const egresosDia = movs.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0);
    const saldoTeorico = saldoInicial + ingresosDia - egresosDia;

    const diferencia = input.saldoReal != null ? Number(input.saldoReal) - saldoTeorico : null;

    return prisma.cierreCaja.upsert({
        where: { cajaId_fecha: { cajaId: input.cajaId, fecha: fechaSolo } },
        update: {
            saldoInicial,
            ingresosDia,
            egresosDia,
            saldoTeorico,
            saldoReal: input.saldoReal ?? null,
            diferencia,
            observaciones: input.observaciones ?? null,
            cerradoPorId: input.cerradoPorId ?? null,
        },
        create: {
            concesionariaId: input.concesionariaId,
            cajaId: input.cajaId,
            fecha: fechaSolo,
            saldoInicial,
            ingresosDia,
            egresosDia,
            saldoTeorico,
            saldoReal: input.saldoReal ?? null,
            diferencia,
            observaciones: input.observaciones ?? null,
            cerradoPorId: input.cerradoPorId ?? null,
        },
    });
};

export const deleteCierre = async (id: number) => {
    const c = await prisma.cierreCaja.findUnique({ where: { id } });
    if (!c || c.deletedAt) throw new ApiError(404, 'Cierre no encontrado', 'NOT_FOUND');
    return prisma.cierreCaja.update({ where: { id }, data: { deletedAt: new Date() } });
};

/**
 * Helper: crea las cajas default para una concesionaria recién creada.
 * Pensado para llamar desde el use case que crea concesionaria.
 */
export const seedCajasDefault = async (concesionariaId: number) => {
    const cajas = [
        { nombre: 'Caja Efectivo', tipo: 'efectivo' as const, moneda: 'ARS' },
        { nombre: 'Caja Mercado Pago', tipo: 'mercado_pago' as const, moneda: 'ARS' },
    ];
    for (const c of cajas) {
        await prisma.caja.upsert({
            where: { concesionariaId_nombre: { concesionariaId, nombre: c.nombre } },
            update: {},
            create: { concesionariaId, ...c },
        });
    }
};
