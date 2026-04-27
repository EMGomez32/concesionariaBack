import { context } from './context';
import * as auditoriaService from '../../modules/auditoria/auditoria.service';
import { logger } from '../logging/logger';

type AccionAudit =
    | 'create' | 'update' | 'cancel' | 'delete_soft' | 'login' | 'logout'
    | 'invite' | 'invite_resent' | 'activate'
    | 'password_reset_requested' | 'password_reset_confirmed';

interface AuditParams {
    entidad: string;
    entidadId?: number | null;
    accion: AccionAudit;
    detalle?: string;
    concesionariaId?: number | null;
    usuarioId?: number | null;
}

// Fire-and-forget audit log writer. Pulls user/ip/userAgent from the
// AsyncLocalStorage context — callers don't need to thread `req` through.
// Failures are logged but never thrown, so a busted audit insert can't
// break the operation that triggered it.
export async function audit(params: AuditParams): Promise<void> {
    try {
        const user = context.getUser();
        const concesionariaId = params.concesionariaId ?? user?.concesionariaId ?? null;

        if (!concesionariaId) {
            logger.warn('[audit] skipped — no concesionariaId in context', { params });
            return;
        }

        await auditoriaService.createAuditLog({
            concesionariaId,
            usuarioId: params.usuarioId ?? user?.userId ?? null,
            entidad: params.entidad,
            entidadId: params.entidadId ?? null,
            accion: params.accion,
            detalle: params.detalle ?? null,
            ip: context.getIp() ?? null,
            userAgent: context.getUserAgent() ?? null,
        } as any);
    } catch (err) {
        logger.error('[audit] failed to write audit log', { err, params });
    }
}
