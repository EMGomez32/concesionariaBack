import bcrypt from 'bcrypt';
import { ITokenService } from '../../../domain/services/ITokenService';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { UnauthorizedException, ForbiddenException } from '../../../domain/exceptions/BaseException';
import prisma from '../../../infrastructure/database/prisma';
import config from '../../../config';

export class Login {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { }

    async execute(email: string, pass: string) {
        const usuario = await prisma.usuario.findFirst({
            where: { email },
            include: {
                roles: { include: { rol: true } }
            }
        });

        // Mensaje genérico para no revelar si el email existe o no.
        if (!usuario || !usuario.passwordHash) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const isMatch = await bcrypt.compare(pass, usuario.passwordHash);
        if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

        // ─── Bloqueo post-autenticación ─────────────────────────────────────
        // El usuario tiene credenciales válidas pero su cuenta no está
        // habilitada. Antes había 3 mensajes distintos (no activo / no
        // verificado / estado != activo) que diferenciaban motivos. Ahora
        // unificamos los dos primeros en uno genérico para no leakear estado
        // interno; mantenemos el de "todavía no activada" porque es un caso
        // legítimo de UX (el user tiene que ir al email de invitación) y
        // solo aparece tras password correcto, así que no es vector real de
        // enumeración.
        if (!usuario.emailVerificado) {
            throw new ForbiddenException(
                'Tu cuenta todavía no está activada. Revisá el email de invitación o pedile a un administrador que te lo reenvíe.',
            );
        }
        if (!usuario.activo || usuario.estado !== 'activo') {
            throw new ForbiddenException('Tu cuenta no está disponible. Contactá a un administrador.');
        }

        const roles = usuario.roles
            .filter(r => !r.deletedAt && !r.rol.deletedAt)
            .map(r => r.rol.nombre);

        const payload = {
            userId: usuario.id,
            concesionariaId: usuario.concesionariaId,
            sucursalId: usuario.sucursalId,
            roles
        };

        const access = this.tokenService.generateAccessToken(payload);
        const refresh = this.tokenService.generateRefreshToken(payload);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(config.jwt.refreshExpirationDays));

        await this.refreshTokenRepository.create({
            token: this.tokenService.hashToken(refresh),
            usuarioId: usuario.id,
            expiresAt
        });

        return {
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                roles,
                concesionariaId: usuario.concesionariaId,
                sucursalId: usuario.sucursalId
            },
            tokens: { access, refresh }
        };
    }
}
