import { z } from 'zod';

const optEmptyStr = z.string().optional().or(z.literal(''));

export const createProveedorSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
    tipo: optEmptyStr,
    telefono: optEmptyStr,
    email: z.email('Email inválido').optional().or(z.literal('')),
    direccion: optEmptyStr,
    activo: z.boolean().optional(),
});

export const updateProveedorSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(200).optional(),
    tipo: optEmptyStr,
    telefono: optEmptyStr,
    email: z.email('Email inválido').optional().or(z.literal('')),
    direccion: optEmptyStr,
    activo: z.boolean().optional(),
});

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
