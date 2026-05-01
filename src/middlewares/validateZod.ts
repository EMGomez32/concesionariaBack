import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import ApiError from '../utils/ApiError';

/**
 * Middleware factory que valida `req.body` (o `req.query`/`req.params`)
 * contra un schema de Zod. Si pasa, reemplaza la propiedad por la versión
 * tipada/parsed (ej: strings convertidas a números si el schema lo dice).
 *
 * Reemplaza progresivamente a `express-validator` (verbose, sin type-safety,
 * errores planos como string concatenado).
 *
 * Beneficios:
 *   - Type-safety: el schema infiere el tipo de `req.body`.
 *   - Errores estructurados: cada `ZodIssue` tiene `path` + `message` + `code`.
 *   - Composición: schemas reutilizables entre endpoints.
 *   - Coercion: `z.coerce.number()` convierte query strings, etc.
 *
 * Uso:
 *   const createCajaSchema = z.object({ nombre: z.string().min(1), tipo: z.enum(...) });
 *   router.post('/', validateZod(createCajaSchema), handler);
 *
 * En el handler `req.body` ya está tipado como `z.infer<typeof schema>`.
 */

type Source = 'body' | 'query' | 'params';

const formatZodError = (err: ZodError) =>
    err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
    }));

export const validateZod = <T>(schema: ZodSchema<T>, source: Source = 'body') => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const data = req[source];
        const result = schema.safeParse(data);

        if (!result.success) {
            const issues = formatZodError(result.error);
            const message = issues
                .map((i) => `${i.path || '(root)'}: ${i.message}`)
                .join('; ');
            return next(
                new ApiError(400, message, 'VALIDATION_ERROR', true, '', { issues })
            );
        }

        // Reemplaza el source por la versión parsed/coerced — los handlers
        // pueden castear `req.body as z.infer<typeof schema>` para tener
        // el tipo correcto.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[source] = result.data;
        next();
    };
};
