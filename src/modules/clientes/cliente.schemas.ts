import { z } from 'zod';

/**
 * Zod schemas para Cliente — reemplaza cliente.validation.ts (express-validator).
 */

const optionalEmptyString = z.string().optional().or(z.literal(''));

export const createClienteSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
    apellido: z.string().max(200).optional(),
    dni: optionalEmptyString,
    cuit: optionalEmptyString,
    email: z.email('Email inválido').optional().or(z.literal('')),
    telefono: optionalEmptyString,
    direccion: optionalEmptyString,
    observaciones: z.string().max(2000).optional(),
});

export const updateClienteSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(200).optional(),
    apellido: z.string().max(200).optional(),
    dni: optionalEmptyString,
    cuit: optionalEmptyString,
    email: z.email('Email inválido').optional().or(z.literal('')),
    telefono: optionalEmptyString,
    direccion: optionalEmptyString,
    observaciones: z.string().max(2000).optional(),
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
