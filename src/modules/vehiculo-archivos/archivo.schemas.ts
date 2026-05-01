import { z } from 'zod';

/**
 * Schema para crear archivo via URL externa (sin upload).
 * El upload multipart NO usa este schema porque multer parsea
 * multipart antes de que llegue al validator.
 */
export const createArchivoSchema = z.object({
    vehiculoId: z.coerce.number().int().positive('vehiculoId debe ser un número'),
    url: z.string().url('url inválida').max(1000),
    tipo: z.string().max(50).optional(),
    descripcion: z.string().max(500).optional(),
});

export type CreateArchivoInput = z.infer<typeof createArchivoSchema>;
