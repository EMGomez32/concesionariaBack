import { Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

/**
 * Middleware obsoleto de tenancy.
 * NOTA: Este middleware ya no es necesario porque contextMiddleware (ejecutado globalmente)
 * ya establece el contexto de usuario en infrastructure/security/context.ts.
 * Se mantiene por compatibilidad con rutas existentes, pero solo valida autenticación.
 */
export const tenancy = (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new ApiError(401, 'Contexto de usuario no encontrado', 'UNAUTHORIZED'));
    }
    
    // El contexto ya fue establecido por contextMiddleware
    // Solo continuamos con la siguiente función
    next();
};
