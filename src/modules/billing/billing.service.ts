import { Prisma, Plan, ConcesionariaSubscription, Invoice, Payment } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions } from '../../types/common';

/* =========================
   Planes (SaaS Core)
========================= */

export const getPlanes = async (filter: Prisma.PlanWhereInput): Promise<Plan[]> => {
    return prisma.plan.findMany({
        where: filter,
        orderBy: { precio: 'asc' }
    });
};

export const createPlan = async (data: Prisma.PlanCreateInput): Promise<Plan> => {
    return prisma.plan.create({ data });
};

export const updatePlan = async (id: number, data: Prisma.PlanUpdateInput): Promise<Plan> => {
    return prisma.plan.update({
        where: { id },
        data
    });
};

/* =========================
   Suscripciones
========================= */

export const getSubscriptionByConcesionariaId = async (concesionariaId: number) => {
    return prisma.concesionariaSubscription.findUnique({
        where: { concesionariaId },
        include: { plan: true }
    });
};

export const createOrUpdateSubscription = async (concesionariaId: number, data: any) => {
    const { planId, status, trialEndsAt, ...rest } = data;

    return prisma.concesionariaSubscription.upsert({
        where: { concesionariaId },
        update: {
            planId,
            status,
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
            ...rest
        },
        create: {
            concesionariaId,
            planId,
            status: status || 'trialing',
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
            ...rest
        }
    });
};

export const updateSubscriptionStatus = async (id: number, status: string) => {
    return prisma.concesionariaSubscription.update({
        where: { id },
        data: { status: status as any }
    });
};

/* =========================
   Facturación e Invoices
========================= */

export const getInvoices = async (filter: Prisma.InvoiceWhereInput, options: QueryOptions) => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    return prisma.invoice.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: { payments: true }
    });
};

export const createInvoice = async (data: any) => {
    return prisma.invoice.create({
        data: {
            ...data,
            periodoDesde: data.periodoDesde ? new Date(data.periodoDesde) : null,
            periodoHasta: data.periodoHasta ? new Date(data.periodoHasta) : null,
            dueDate: data.dueDate ? new Date(data.dueDate) : null
        }
    });
};

export const getInvoiceById = async (id: number) => {
    return prisma.invoice.findUnique({
        where: { id },
        include: { payments: true, subscription: { include: { plan: true, concesionaria: true } } }
    });
};

/* =========================
   Pagos
========================= */

export const registrarPagoInvoice = async (invoiceId: number, data: { monto: number; moneda?: string; metodo?: string; provider?: string; providerPaymentId?: string }) => {
    return prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw new ApiError(404, 'Factura no encontrada');

        const pago = await tx.payment.create({
            data: {
                invoiceId,
                status: 'succeeded',
                monto: data.monto,
                moneda: data.moneda || invoice.moneda,
                metodo: data.metodo as any,
                provider: data.provider,
                providerPaymentId: data.providerPaymentId
            }
        });

        const totalPagado = await tx.payment.aggregate({
            _sum: { monto: true },
            where: { invoiceId, status: 'succeeded' }
        });

        if (totalPagado._sum.monto && Number(totalPagado._sum.monto) >= Number(invoice.total)) {
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'paid', paidAt: new Date() }
            });
        }

        return pago;
    });
};
