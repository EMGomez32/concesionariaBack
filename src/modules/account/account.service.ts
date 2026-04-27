import bcrypt from 'bcrypt';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { issueToken, consumeToken, TokenInvalidError } from '../../infrastructure/security/accountTokens';
import { getEmailTransport } from '../../infrastructure/email/emailService';
import { renderActivacionEmail } from '../../infrastructure/email/templates/activacion';
import { renderResetEmail } from '../../infrastructure/email/templates/reset';
import * as auditoriaService from '../auditoria/auditoria.service';

const PASSWORD_BCRYPT_COST = 10;

const ACTIVATION_EXPIRES_HOURS = 48;
const ACTIVATION_EXPIRES_MS = ACTIVATION_EXPIRES_HOURS * 60 * 60 * 1000;
const RESET_EXPIRES_MINUTES = 60;
const RESET_EXPIRES_MS = RESET_EXPIRES_MINUTES * 60 * 1000;

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
function validatePassword(pwd: string) {
    if (!pwd || typeof pwd !== 'string') {
        throw new ApiError(400, 'Contraseña requerida', 'WEAK_PASSWORD');
    }
    if (!PASSWORD_REGEX.test(pwd)) {
        throw new ApiError(400, 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.', 'WEAK_PASSWORD');
    }
}

interface InviteUsuarioInput {
    nombre: string;
    email: string;
    concesionariaId: number | null;
    sucursalId: number | null;
    roleIds: number[];
    invitadoPorUsuarioId?: number;
}

/**
 * Crea un usuario en estado `pendiente` sin password, emite token de activación
 * y dispara el email. Devuelve el usuario creado (sin tokens crudos).
 */
export async function inviteUsuario(input: InviteUsuarioInput) {
    const { nombre, email, concesionariaId, sucursalId, roleIds, invitadoPorUsuarioId } = input;

    if (!nombre || !email || !roleIds?.length) {
        throw new ApiError(400, 'Faltan campos obligatorios (nombre, email, roleIds)', 'VALIDATION_ERROR');
    }
    if (concesionariaId == null) {
        throw new ApiError(400, 'concesionariaId es requerido', 'VALIDATION_ERROR');
    }

    // Email único dentro de la concesionaria
    const exists = await prisma.usuario.findFirst({
        where: { email, concesionariaId, deletedAt: null },
    });
    if (exists) {
        throw new ApiError(409, 'Ya existe un usuario con ese email en esta concesionaria', 'EMAIL_TAKEN');
    }

    const usuario = await prisma.usuario.create({
        data: {
            nombre,
            email,
            concesionariaId,
            sucursalId,
            passwordHash: null,
            emailVerificado: false,
            estado: 'pendiente',
            activo: true,
            roles: { create: roleIds.map(rolId => ({ rolId })) },
        },
        include: {
            roles: { include: { rol: true } },
        },
    });

    await sendInvitationEmail(usuario.id);

    if (invitadoPorUsuarioId) {
        await auditoriaService.createAuditLog({
            concesionariaId: concesionariaId,
            usuarioId: invitadoPorUsuarioId,
            entidad: 'Usuario',
            entidadId: usuario.id,
            accion: 'invite',
            detalle: `Usuario ${email} invitado`,
        });
    }

    return usuario;
}

/**
 * Reenvía la invitación de activación a un usuario pendiente.
 * Idempotente: invalida tokens previos y emite uno nuevo.
 */
export async function resendInvitation(usuarioId: number, ejecutadoPorUsuarioId?: number) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ApiError(404, 'Usuario no encontrado', 'NOT_FOUND');
    if (usuario.emailVerificado) {
        throw new ApiError(400, 'El usuario ya tiene su email verificado', 'ALREADY_VERIFIED');
    }
    await sendInvitationEmail(usuarioId);

    if (ejecutadoPorUsuarioId) {
        await auditoriaService.createAuditLog({
            concesionariaId: usuario.concesionariaId as number,
            usuarioId: ejecutadoPorUsuarioId,
            entidad: 'Usuario',
            entidadId: usuario.id,
            accion: 'invite_resent',
            detalle: `Reenvío de invitación a ${usuario.email}`,
        });
    }
    return { ok: true };
}

async function sendInvitationEmail(usuarioId: number) {
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        include: { roles: { include: { rol: true } } },
    });
    if (!usuario) throw new ApiError(404, 'Usuario no encontrado', 'NOT_FOUND');

    const { rawToken } = await issueToken({
        usuarioId,
        tipo: 'activacion',
        expiresInMs: ACTIVATION_EXPIRES_MS,
    });

    const url = `${APP_BASE_URL}/activar-cuenta?token=${encodeURIComponent(rawToken)}`;
    const rolPrincipal = usuario.roles
        .filter(r => !r.deletedAt)
        .map(r => r.rol.nombre)
        .join(', ') || '—';

    const { subject, html, text } = renderActivacionEmail({
        nombre: usuario.nombre,
        rol: rolPrincipal,
        activacionUrl: url,
        expiresInHours: ACTIVATION_EXPIRES_HOURS,
    });
    await getEmailTransport().send({ to: usuario.email, subject, html, text });
}

/**
 * Consume token de activación, crea password, marca email verificado y estado activo.
 */
export async function activateAccount(rawToken: string, password: string) {
    validatePassword(password);

    let usuarioId: number;
    try {
        ({ usuarioId } = await consumeToken(rawToken, 'activacion'));
    } catch (e) {
        if (e instanceof TokenInvalidError) {
            throw new ApiError(400, 'El link de activación es inválido o expiró. Pedile a un administrador que te reenvíe la invitación.', 'INVALID_TOKEN');
        }
        throw e;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ApiError(404, 'Usuario no encontrado', 'NOT_FOUND');

    const passwordHash = await bcrypt.hash(password, PASSWORD_BCRYPT_COST);

    const updated = await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
            passwordHash,
            emailVerificado: true,
            estado: 'activo',
        },
        include: { roles: { include: { rol: true } } },
    });

    if (updated.concesionariaId) {
        await auditoriaService.createAuditLog({
            concesionariaId: updated.concesionariaId,
            usuarioId: updated.id,
            entidad: 'Usuario',
            entidadId: updated.id,
            accion: 'activate',
            detalle: `Cuenta activada por ${updated.email}`,
        });
    }

    return { ok: true, email: updated.email };
}

/**
 * Solicita un reset de password. SIEMPRE devuelve éxito (no leak de existencia).
 * Solo dispara email si:
 *   - el usuario existe
 *   - tiene emailVerificado=true (no está en flujo de activación)
 *   - tiene estado=activo
 */
export async function requestPasswordReset(email: string) {
    if (!email || typeof email !== 'string') {
        // Seguimos devolviendo el mensaje genérico aunque el email sea basura
        return { ok: true };
    }

    const usuario = await prisma.usuario.findFirst({
        where: { email, deletedAt: null },
    });

    if (usuario && usuario.emailVerificado && usuario.estado === 'activo') {
        const { rawToken } = await issueToken({
            usuarioId: usuario.id,
            tipo: 'reset',
            expiresInMs: RESET_EXPIRES_MS,
        });

        const url = `${APP_BASE_URL}/restablecer-password?token=${encodeURIComponent(rawToken)}`;
        const { subject, html, text } = renderResetEmail({
            nombre: usuario.nombre,
            resetUrl: url,
            expiresInMinutes: RESET_EXPIRES_MINUTES,
        });
        await getEmailTransport().send({ to: usuario.email, subject, html, text });

        if (usuario.concesionariaId) {
            await auditoriaService.createAuditLog({
                concesionariaId: usuario.concesionariaId,
                usuarioId: usuario.id,
                entidad: 'Usuario',
                entidadId: usuario.id,
                accion: 'password_reset_requested',
                detalle: `Reset solicitado para ${email}`,
            });
        }
    }

    return { ok: true };
}

/**
 * Confirma el reset: valida token + escribe nueva password + invalida sesiones.
 */
export async function confirmPasswordReset(rawToken: string, newPassword: string) {
    validatePassword(newPassword);

    let usuarioId: number;
    try {
        ({ usuarioId } = await consumeToken(rawToken, 'reset'));
    } catch (e) {
        if (e instanceof TokenInvalidError) {
            throw new ApiError(400, 'El link de restablecimiento es inválido o expiró. Solicitá uno nuevo.', 'INVALID_TOKEN');
        }
        throw e;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ApiError(404, 'Usuario no encontrado', 'NOT_FOUND');
    if (!usuario.emailVerificado) {
        throw new ApiError(400, 'La cuenta no tiene email verificado', 'EMAIL_NOT_VERIFIED');
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_BCRYPT_COST);

    await prisma.$transaction(async (tx) => {
        await tx.usuario.update({
            where: { id: usuarioId },
            data: { passwordHash },
        });
        // Revocar todos los refresh tokens activos: forzar re-login.
        await tx.refreshToken.updateMany({
            where: { usuarioId, isRevoked: false },
            data: { isRevoked: true },
        });
    });

    if (usuario.concesionariaId) {
        await auditoriaService.createAuditLog({
            concesionariaId: usuario.concesionariaId,
            usuarioId: usuario.id,
            entidad: 'Usuario',
            entidadId: usuario.id,
            accion: 'password_reset_confirmed',
            detalle: `Password restablecido para ${usuario.email}`,
        });
    }

    return { ok: true };
}
