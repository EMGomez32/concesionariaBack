import { z } from 'zod';

export const createMarcaSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
    concesionariaId: z.coerce.number().int().positive().optional(),
    activo: z.boolean().optional(),
});

export const updateMarcaSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(100).optional(),
    activo: z.boolean().optional(),
});

export type CreateMarcaInput = z.infer<typeof createMarcaSchema>;
export type UpdateMarcaInput = z.infer<typeof updateMarcaSchema>;
