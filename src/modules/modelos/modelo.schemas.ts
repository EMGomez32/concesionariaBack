import { z } from 'zod';

export const createModeloSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
    marcaId: z.coerce.number().int().positive('marcaId debe ser un número'),
    concesionariaId: z.coerce.number().int().positive().optional(),
    activo: z.boolean().optional(),
});

export const updateModeloSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(100).optional(),
    activo: z.boolean().optional(),
});

export type CreateModeloInput = z.infer<typeof createModeloSchema>;
export type UpdateModeloInput = z.infer<typeof updateModeloSchema>;
