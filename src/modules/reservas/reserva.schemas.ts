import { z } from 'zod';

const estadosReserva = ['activa', 'completada', 'cancelada', 'vencida'] as const;
const monedas = ['ARS', 'USD'] as const;

export const createReservaSchema = z.object({
    sucursalId: z.coerce.number().int().positive('sucursalId debe ser un número'),
    vendedorId: z.coerce.number().int().positive('vendedorId debe ser un número'),
    clienteId: z.coerce.number().int().positive('clienteId debe ser un número'),
    vehiculoId: z.coerce.number().int().positive('vehiculoId debe ser un número'),
    monto: z.coerce.number().positive('Monto debe ser un número positivo'),
    moneda: z.enum(monedas, { message: 'Moneda inválida' }),
    fechaVencimiento: z.string().datetime({ offset: true }).or(z.iso.date()),
    observaciones: z.string().max(2000).optional(),
});

export const updateReservaSchema = z.object({
    estado: z.enum(estadosReserva).optional(),
    monto: z.coerce.number().positive().optional(),
    fechaVencimiento: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    observaciones: z.string().max(2000).optional(),
});

export type CreateReservaInput = z.infer<typeof createReservaSchema>;
export type UpdateReservaInput = z.infer<typeof updateReservaSchema>;
