/**
 * Lógica de generación/validación de tokens de cuenta (activación + reset).
 *
 * Diseño de seguridad:
 *  - El token CRUDO se genera con crypto.randomBytes(32) → 256 bits de entropía.
 *  - Se devuelve al caller (para mandar por email) y se guarda solo el bcrypt-hash.
 *  - Un atacante con read-access a la DB no puede usar los tokens.
 *  - Cada token es single-use: se marca usedAt al consumirse.
 *  - Cuando se emite uno nuevo del mismo tipo para el mismo usuario, los anteriores
 *    se invalidan (usedAt = now()) para evitar acumulación de tokens válidos.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma, AccountTokenType } from '@prisma/client';
import prisma from '../../prisma';

const BCRYPT_COST = 10;

export interface IssuedToken {
    /** Token plano para mandar por email. NO se persiste. */
    rawToken: string;
    /** Registro persistido (sin el rawToken). */
    record: { id: number; expiresAt: Date };
}

export interface IssueOpts {
    usuarioId: number;
    tipo: AccountTokenType;
    expiresInMs: number;
    /** Si true, marca como usados los tokens previos del mismo tipo. Default true. */
    invalidatePrevious?: boolean;
}

/**
 * Crea un token nuevo para el usuario. Devuelve el valor plano (para email)
 * y persiste solo el hash.
 */
export async function issueToken(opts: IssueOpts): Promise<IssuedToken> {
    const { usuarioId, tipo, expiresInMs } = opts;
    const invalidatePrevious = opts.invalidatePrevious ?? true;

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const record = await prisma.$transaction(async (tx) => {
        if (invalidatePrevious) {
            await tx.accountToken.updateMany({
                where: { usuarioId, tipo, usedAt: null },
                data: { usedAt: new Date() },
            });
        }
        return tx.accountToken.create({
            data: { usuarioId, tipo, tokenHash, expiresAt },
            select: { id: true, expiresAt: true },
        });
    });

    return { rawToken, record };
}

/**
 * Consume un token (lo busca, valida vencimiento y single-use, lo marca usado).
 * Devuelve el usuarioId si es válido. Lanza error si no.
 *
 * IMPORTANTE: bcrypt.compare es resistente a timing attacks por diseño.
 * Como no podemos buscar por hash directamente (cada hash tiene distinto salt),
 * iteramos los tokens válidos del tipo dado y comparamos uno por uno.
 * En la práctica el caller también pasa un hint de email/usuarioId si lo tiene
 * para acotar la búsqueda — pero el flujo público no lo tiene.
 */
export async function consumeToken(rawToken: string, tipo: AccountTokenType): Promise<{ usuarioId: number }> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) {
        throw new TokenInvalidError();
    }

    const candidates = await prisma.accountToken.findMany({
        where: {
            tipo,
            usedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { id: 'desc' },
        take: 200, // límite defensivo; en práctica son pocos
    });

    for (const c of candidates) {
        const match = await bcrypt.compare(rawToken, c.tokenHash);
        if (match) {
            await prisma.accountToken.update({
                where: { id: c.id },
                data: { usedAt: new Date() },
            });
            return { usuarioId: c.usuarioId };
        }
    }

    throw new TokenInvalidError();
}

/** Limpia tokens expirados o ya usados (cron periódico). */
export async function purgeOldTokens(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const where: Prisma.AccountTokenWhereInput = {
        OR: [
            { usedAt: { lt: cutoff } },
            { expiresAt: { lt: cutoff } },
        ],
    };
    const r = await prisma.accountToken.deleteMany({ where });
    return r.count;
}

export class TokenInvalidError extends Error {
    constructor() {
        super('Token inválido o expirado');
        this.name = 'TokenInvalidError';
    }
}
