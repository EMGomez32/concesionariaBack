import ApiError from './ApiError';
import { TokenPayload } from '../auth/auth.service';

/**
 * Verifica que el usuario pertenezca a la misma concesionaria que el recurso,
 * o que sea super_admin para saltar la validación.
 */
export function requireSameTenant(user: TokenPayload | undefined, resourceConcesionariaId: number | null | undefined) {
    if (!user) {
        throw new ApiError(401, 'No autenticado', 'UNAUTHORIZED');
    }

    // El super_admin tiene acceso global
    if (user.roles.includes('super_admin')) {
        return;
    }

    // Si el recurso no tiene concesionariaId (muy raro) o no coincide con la del usuario
    if (user.concesionariaId !== resourceConcesionariaId) {
        throw new ApiError(403, 'No tiene acceso a este recurso', 'FORBIDDEN');
    }
}
