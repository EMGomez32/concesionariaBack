import { RefreshToken } from '../entities/Auth';

export interface IRefreshTokenRepository {
    create(data: { token: string; usuarioId: number; expiresAt: Date }): Promise<RefreshToken>;
    findByToken(token: string): Promise<RefreshToken | null>;
    update(id: number, data: { isRevoked: boolean }): Promise<void>;
    revokeAllForUser(usuarioId: number): Promise<void>;
    /**
     * Marca un refresh token como revocado SOLO si todavía está activo.
     * Devuelve `true` si la transición se aplicó (este request gana), `false`
     * si otro request ya lo revocó (race condition / reuse — debemos rechazar).
     *
     * Implementado con `updateMany` + `where: {id, isRevoked: false}` que es
     * atómico a nivel SQL: la base devuelve `count=0` si ya estaba revocado.
     */
    revokeIfActive(id: number): Promise<boolean>;
}
