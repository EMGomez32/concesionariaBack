import { z } from 'zod';

/**
 * Zod schema para PostventaItem. ALINEADO con el modelo Prisma
 * (que tiene `monto`, `fecha`, `casoId`, `proveedorId`, `descripcion`,
 * `comprobanteUrl` — NO `costo`+`precio` como tenía la validation vieja).
 */

export const createItemSchema = z.object({
    casoId: z.coerce.number().int().positive('casoId debe ser un número'),
    fecha: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    descripcion: z.string().min(1, 'La descripción es obligatoria').max(2000),
    monto: z.coerce.number().nonnegative('monto debe ser ≥ 0'),
    proveedorId: z.coerce.number().int().positive().nullable().optional(),
    comprobanteUrl: z.string().max(500).optional().or(z.literal('')),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
