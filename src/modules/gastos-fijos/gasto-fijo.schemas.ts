import { z } from 'zod';

const optInt = z.coerce.number().int().nullable().optional();
const optEmptyStr = z.string().optional().or(z.literal(''));

export const createGastoFijoSchema = z.object({
    categoriaId: z.coerce.number().int().positive('categoriaId debe ser un entero positivo'),
    sucursalId: optInt,
    proveedorId: optInt,
    anio: z.coerce.number().int().min(2000, 'anio debe ser ≥ 2000').max(2100),
    mes: z.coerce.number().int().min(1, 'mes debe estar entre 1 y 12').max(12),
    monto: z.coerce.number().positive('monto debe ser > 0'),
    descripcion: z.string().min(1, 'descripcion es obligatoria').max(500),
    comprobanteUrl: optEmptyStr,
});

export const updateGastoFijoSchema = z.object({
    categoriaId: z.coerce.number().int().positive().optional(),
    sucursalId: optInt,
    proveedorId: optInt,
    anio: z.coerce.number().int().min(2000).max(2100).optional(),
    mes: z.coerce.number().int().min(1).max(12).optional(),
    monto: z.coerce.number().positive().optional(),
    descripcion: z.string().min(1).max(500).optional(),
    comprobanteUrl: optEmptyStr,
});

export type CreateGastoFijoInput = z.infer<typeof createGastoFijoSchema>;
export type UpdateGastoFijoInput = z.infer<typeof updateGastoFijoSchema>;
