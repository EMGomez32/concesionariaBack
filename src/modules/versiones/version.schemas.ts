import { z } from 'zod';

export const createVersionSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
    modeloId: z.coerce.number().int().positive('modeloId debe ser un número'),
    concesionariaId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().min(1900, 'Año inválido').max(2100).optional(),
    precioSugerido: z.coerce.number().nonnegative('precioSugerido debe ser ≥ 0').optional(),
    activo: z.boolean().optional(),
});

export const updateVersionSchema = z.object({
    nombre: z.string().min(1).max(100).optional(),
    anio: z.coerce.number().int().min(1900).max(2100).optional(),
    precioSugerido: z.coerce.number().nonnegative().optional(),
    activo: z.boolean().optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type UpdateVersionInput = z.infer<typeof updateVersionSchema>;
