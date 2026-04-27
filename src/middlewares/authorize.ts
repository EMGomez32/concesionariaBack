import { Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

export const authorize = (...requiredRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'No autenticado', 'UNAUTHORIZED'));
        }

        const hasRole = req.user.roles.some((role: string) =>
            requiredRoles.includes(role) || role === 'super_admin'
        );

        if (!hasRole) {
            return next(new ApiError(403, 'No tiene permisos suficientes', 'FORBIDDEN'));
        }

        next();
    };
};
