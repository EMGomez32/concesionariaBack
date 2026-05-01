import { z } from 'zod';

const optEmptyStr = z.string().optional().or(z.literal(''));

export const createSucursalSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
    direccion: optEmptyStr,
    telefono: optEmptyStr,
    concesionariaId: z.coerce.number().int().positive('concesionariaId debe ser un número positivo'),
});

export const updateSucursalSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(200).optional(),
    direccion: optEmptyStr,
    telefono: optEmptyStr,
    activo: z.boolean().optional(),
});

export type CreateSucursalInput = z.infer<typeof createSucursalSchema>;
export type UpdateSucursalInput = z.infer<typeof updateSucursalSchema>;
