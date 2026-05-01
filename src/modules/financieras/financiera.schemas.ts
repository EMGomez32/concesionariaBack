import { z } from 'zod';

const optEmptyStr = z.string().optional().or(z.literal(''));

export const createFinancieraSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
    contacto: optEmptyStr,
    telefono: optEmptyStr,
    email: z.email('Email inválido').optional().or(z.literal('')),
    activo: z.boolean().optional(),
});

export const updateFinancieraSchema = z.object({
    nombre: z.string().min(1).max(200).optional(),
    contacto: optEmptyStr,
    telefono: optEmptyStr,
    email: z.email('Email inválido').optional().or(z.literal('')),
    activo: z.boolean().optional(),
});

export type CreateFinancieraInput = z.infer<typeof createFinancieraSchema>;
export type UpdateFinancieraInput = z.infer<typeof updateFinancieraSchema>;
