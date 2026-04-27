import { Request, Response } from 'express';
import * as billingService from './billing.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import pick from '../../utils/pick';

/* =========================
   Planes
========================= */

export const getPlanes = catchAsync(async (req: Request, res: Response) => {
    const filter = pick(req.query, ['activo', 'interval', 'moneda']);
    const result = await billingService.getPlanes(filter);
    res.send(ApiResponse.success(result));
});

export const createPlan = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.createPlan(req.body);
    res.status(201).send(ApiResponse.success(result, 'Plan creado correctamente'));
});

export const updatePlan = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.updatePlan(parseInt(req.params.id as string, 10), req.body);
    res.send(ApiResponse.success(result, 'Plan actualizado correctamente'));
});

/* =========================
   Suscripciones
========================= */

export const getMySubscription = catchAsync(async (req: Request, res: Response) => {
    const concesionariaId = req.user?.concesionariaId as number;
    const result = await billingService.getSubscriptionByConcesionariaId(concesionariaId);
    res.send(ApiResponse.success(result));
});

export const getSubscriptionByConcesionariaId = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.getSubscriptionByConcesionariaId(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const updateSubscription = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.createOrUpdateSubscription(parseInt(req.params.id as string, 10), req.body);
    res.send(ApiResponse.success(result, 'Suscripción actualizada correctamente'));
});

/* =========================
   Invoices y Facturación
========================= */

export const getInvoices = catchAsync(async (req: Request, res: Response) => {
    const filter = pick(req.query, ['status', 'subscriptionId']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        const sub = await billingService.getSubscriptionByConcesionariaId(user.concesionariaId as number);
        filter.subscriptionId = sub?.id || 0;
    }

    const result = await billingService.getInvoices(filter, options);
    res.send(ApiResponse.success(result));
});

export const getInvoiceById = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.getInvoiceById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.createInvoice(req.body);
    res.status(201).send(ApiResponse.success(result, 'Factura creada correctamente'));
});

/* =========================
   Pagos
========================= */

export const registrarPagoInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await billingService.registrarPagoInvoice(parseInt(req.params.id as string, 10), req.body);
    res.status(201).send(ApiResponse.success(result, 'Pago registrado correctamente'));
});
