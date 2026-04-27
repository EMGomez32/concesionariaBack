import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import config from '../config';
import ApiError from '../utils/ApiError';

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export interface TokenPayload {
    userId: number;
    concesionariaId: number | null;
    sucursalId: number | null;
    roles: string[];
}

const generateToken = (payload: TokenPayload, secret: string, expires: string): string => {
    return jwt.sign(payload, secret, { expiresIn: expires as any });
};

export const login = async (email: string, pass: string) => {
    // Buscamos el usuario por su email. 
    // Dado que el esquema actual tiene @@unique([concesionariaId, email]), 
    // findUnique no funcionará solo con email. Usamos findFirst.
    const usuario = await prisma.usuario.findFirst({
        where: { email },
        include: {
            roles: {
                include: { rol: true }
            }
        }
    });

    if (!usuario || !usuario.passwordHash) {
        throw new ApiError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    const isPasswordMatch = await bcrypt.compare(pass, usuario.passwordHash);
    if (!isPasswordMatch) {
        throw new ApiError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    if (!usuario.activo) {
        throw new ApiError(403, 'Usuario inactivo', 'USER_INACTIVE');
    }
    if (!usuario.emailVerificado) {
        throw new ApiError(403, 'Tu cuenta todavía no está activada. Revisá el email de invitación.', 'EMAIL_NOT_VERIFIED');
    }
    if (usuario.estado !== 'activo') {
        throw new ApiError(403, 'Tu cuenta no está activa. Contactá a un administrador.', 'USER_INACTIVE');
    }

    // Filtrar roles activos (no eliminados)
    const rolesActivos = usuario.roles.filter(r => !r.deletedAt && !r.rol.deletedAt);
    const roles = rolesActivos.map(r => r.rol.nombre);

    const payload: TokenPayload = {
        userId: usuario.id,
        concesionariaId: usuario.concesionariaId,
        sucursalId: usuario.sucursalId,
        roles
    };

    const accessToken = generateToken(payload, config.jwt.secret, config.jwt.accessExpirationMinutes);
    const refreshToken = generateToken(payload, config.jwt.refreshSecret, config.jwt.refreshExpirationDays);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(config.jwt.refreshExpirationDays)); // Asume que '7d' es ~7 días para Simplificar

    await prisma.refreshToken.create({
        data: {
            token: hashToken(refreshToken),
            usuarioId: usuario.id,
            expiresAt,
        }
    });

    return {
        user: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            roles
        },
        tokens: {
            access: {
                token: accessToken,
                expires: config.jwt.accessExpirationMinutes
            },
            refresh: {
                token: refreshToken,
                expires: config.jwt.refreshExpirationDays
            }
        }
    };
};

export const refreshAuth = async (refreshToken: string) => {
    try {
        const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

        const hashedToken = hashToken(refreshToken);
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: hashedToken }
        });

        if (!storedToken) {
            throw new Error('Refresh token no encontrado');
        }

        if (storedToken.isRevoked) {
            // Rotación comprometida: revocar todos los tokens del usuario
            await prisma.refreshToken.updateMany({
                where: { usuarioId: storedToken.usuarioId },
                data: { isRevoked: true }
            });
            throw new Error('Refresh token revocado, re-autenticación obligatoria');
        }

        if (storedToken.expiresAt < new Date()) {
            throw new Error('Refresh token expirado');
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });
        if (!usuario || !usuario.activo) {
            throw new Error('Usuario inválido o inactivo');
        }

        // Revocar el token usado (rotation)
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true }
        });

        // Generar nuevo par de tokens
        const newAccessToken = generateToken(
            { userId: payload.userId, concesionariaId: payload.concesionariaId, sucursalId: payload.sucursalId, roles: payload.roles },
            config.jwt.secret,
            config.jwt.accessExpirationMinutes
        );
        const newRefreshToken = generateToken(
            { userId: payload.userId, concesionariaId: payload.concesionariaId, sucursalId: payload.sucursalId, roles: payload.roles },
            config.jwt.refreshSecret,
            config.jwt.refreshExpirationDays
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(config.jwt.refreshExpirationDays));

        await prisma.refreshToken.create({
            data: {
                token: hashToken(newRefreshToken),
                usuarioId: usuario.id,
                expiresAt,
            }
        });

        return {
            access: {
                token: newAccessToken,
                expires: config.jwt.accessExpirationMinutes
            },
            refresh: {
                token: newRefreshToken,
                expires: config.jwt.refreshExpirationDays
            }
        };
    } catch (error) {
        throw new ApiError(401, 'Refresh token inválido', 'INVALID_REFRESH_TOKEN');
    }
};
