import { z } from 'zod';

/**
 * Zod schemas para Usuario. Reemplaza usuario.validation.ts.
 *
 * NOTA: el alta de usuario NO acepta password — se emite por flujo de
 * invitación, el usuario lo crea al activar su cuenta.
 */

export const createUserSchema = z.object({
    email: z.email('Email inválido').toLowerCase(),
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
    telefono: z.string().max(50).optional(),
    direccion: z.string().max(300).optional(),
    concesionariaId: z.coerce.number().int().positive().optional(),
    sucursalId: z.coerce.number().int().positive().optional(),
    roleIds: z
        .array(z.coerce.number().int().positive())
        .min(1, 'Debe asignarse al menos un rol'),
});

export const updateUserSchema = z.object({
    email: z.email('Email inválido').optional(),
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(200).optional(),
    telefono: z.string().max(50).optional(),
    direccion: z.string().max(300).optional(),
    activo: z.boolean().optional(),
    sucursalId: z.coerce.number().int().positive().optional(),
    roleIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
