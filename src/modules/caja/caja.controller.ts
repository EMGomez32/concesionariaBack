import { Request, Response } from 'express';
import * as cajaService from './caja.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { cleanFilters } from '../../utils/cleanFilters';

/* ── Cajas ── */

export const getCajas = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['concesionariaId', 'tipo', 'activo']);
    filter = parseNumericFields(filter, ['concesionariaId']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }
    const cajas = await cajaService.getCajas(filter);
    // Adjuntar saldo actual de cada caja
    const enriched = await Promise.all(cajas.map(async c => ({
        ...c,
        saldoActual: await cajaService.getSaldoCaja(c.id),
    })));
    res.send(ApiResponse.success(enriched));
});

export const createCaja = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body };
    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }
    const result = await cajaService.createCaja(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateCaja = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await cajaService.updateCaja(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteCaja = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await cajaService.deleteCaja(id);
    res.send(ApiResponse.success({ message: 'Caja eliminada' }));
});

/* ── Movimientos ── */

export const getMovimientos = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['cajaId', 'tipo', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
    filter = parseNumericFields(filter, ['cajaId', 'concesionariaId']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await cajaService.getMovimientos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const createMovimiento = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body };
    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }
    if (typeof data.fecha === 'string') data.fecha = new Date(data.fecha);
    if (data.registradoPorId === undefined && user?.userId) {
        data.registradoPorId = user.userId;
    }
    const result = await cajaService.createMovimiento(data);
    res.status(201).send(ApiResponse.success(result));
});

export const deleteMovimiento = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await cajaService.deleteMovimiento(id);
    res.send(ApiResponse.success({ message: 'Movimiento eliminado' }));
});

/* ── Cierres ── */

export const getCierres = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['cajaId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
    filter = parseNumericFields(filter, ['cajaId', 'concesionariaId']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await cajaService.getCierres(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const cerrarDia = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const concesionariaId = user && !user.roles.includes('super_admin')
        ? (user.concesionariaId as number)
        : (req.body.concesionariaId as number);

    const result = await cajaService.cerrarDia({
        concesionariaId,
        cajaId: Number(req.body.cajaId),
        fecha: new Date(req.body.fecha),
        saldoReal: req.body.saldoReal != null ? Number(req.body.saldoReal) : null,
        observaciones: req.body.observaciones ?? null,
        cerradoPorId: user?.userId ?? null,
    });
    res.status(201).send(ApiResponse.success(result));
});

export const deleteCierre = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await cajaService.deleteCierre(id);
    res.send(ApiResponse.success({ message: 'Cierre eliminado' }));
});
