import { z } from 'zod';

const estadosCaso = ['pendiente', 'en_proceso', 'cerrado', 'anulado'] as const;

export const createCasoSchema = z.object({
    clienteId: z.coerce.number().int().positive('clienteId debe ser un número'),
    vehiculoId: z.coerce.number().int().positive('vehiculoId debe ser un número'),
    ventaId: z.coerce.number().int().positive().optional(),
    sucursalId: z.coerce.number().int().positive('sucursalId debe ser un número'),
    fechaReclamo: z.string().datetime({ offset: true }).or(z.iso.date()).optional(),
    tipo: z.string().max(100).optional(),
    descripcion: z.string().min(1, 'La descripción es obligatoria').max(2000),
    estado: z.enum(estadosCaso).optional(),
});

export const updateCasoSchema = z.object({
    estado: z.enum(estadosCaso).optional(),
    descripcion: z.string().max(2000).optional(),
    tipo: z.string().max(100).optional(),
    fechaCierre: z.string().datetime({ offset: true }).or(z.iso.date()).nullable().optional(),
});

export type CreateCasoInput = z.infer<typeof createCasoSchema>;
export type UpdateCasoInput = z.infer<typeof updateCasoSchema>;
