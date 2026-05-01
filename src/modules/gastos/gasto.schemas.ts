import { z } from 'zod';

const monedas = ['ARS', 'USD'] as const;
const tipos = ['FIJO', 'VEHICULO'] as const;

export const createGastoSchema = z.object({
    monto: z.coerce.number().positive('Monto debe ser > 0'),
    moneda: z.enum(monedas).optional(),
    tipo: z.enum(tipos).optional(),
    categoriaId: z.coerce.number().int().positive('categoriaId debe ser un número'),
    vehiculoId: z.coerce.number().int().positive().optional(),
    sucursalId: z.coerce.number().int().positive('sucursalId debe ser un número').optional(),
    fechaGasto: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    fecha: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    descripcion: z.string().max(2000).optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
    comprobanteUrl: z.string().max(500).optional(),
});

export const updateGastoSchema = z.object({
    monto: z.coerce.number().positive().optional(),
    descripcion: z.string().max(2000).optional(),
    fecha: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    fechaGasto: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    categoriaId: z.coerce.number().int().positive().optional(),
    proveedorId: z.coerce.number().int().positive().nullable().optional(),
    comprobanteUrl: z.string().max(500).optional(),
});

export type CreateGastoInput = z.infer<typeof createGastoSchema>;
export type UpdateGastoInput = z.infer<typeof updateGastoSchema>;
