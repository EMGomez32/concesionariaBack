import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../../infrastructure/security/JwtTokenService';
import { PrismaRefreshTokenRepository } from '../../infrastructure/database/repositories/PrismaRefreshTokenRepository';
import { Login } from '../../application/use-cases/auth/Login';
import { RefreshAuth } from '../../application/use-cases/auth/RefreshAuth';
import { audit } from '../../infrastructure/security/audit';
import { context } from '../../infrastructure/security/context';

const tokenService = new JwtTokenService();
const refreshRepo = new PrismaRefreshTokenRepository();
const loginUC = new Login(tokenService, refreshRepo);
const refreshUC = new RefreshAuth(tokenService, refreshRepo);

export class AuthController {
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const result = await loginUC.execute(email, password);

            // Login is unauthenticated, so the context middleware did not pre-fill
            // user info. Pass usuarioId/concesionariaId explicitly.
            if (result.user.concesionariaId) {
                await audit({
                    entidad: 'Usuario',
                    accion: 'login',
                    entidadId: result.user.id,
                    detalle: `Login ${result.user.email}`,
                    usuarioId: result.user.id,
                    concesionariaId: result.user.concesionariaId,
                });
            }

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;
            const result = await refreshUC.execute(refreshToken);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const user = context.getUser();
            if (user?.concesionariaId) {
                await audit({
                    entidad: 'Usuario',
                    accion: 'logout',
                    entidadId: user.userId,
                    detalle: `Logout usuario ${user.userId}`,
                });
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
