import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { BaseException } from '../../../domain/exceptions/BaseException';
import { inviteUsuario } from '../../../modules/account/account.service';
import { context } from '../../../infrastructure/security/context';
import prisma from '../../../infrastructure/database/prisma';

/**
 * Alta de usuario por flujo de invitación. Ya NO crea password directo;
 * delega en `account.service.inviteUsuario`, que crea el usuario en estado
 * pendiente, emite token de activación, dispara email y registra auditoría.
 *
 * El password lo crea el propio invitado al hacer click en el link del email
 * (POST /api/account/activate).
 */
export class CreateUsuario {
    // El repositorio del use case original ya no se usa, pero lo conservamos
    // en la firma para no romper el wiring del controller. Sale dead-code,
    // se puede limpiar cuando se elimine la capa clean para usuarios.
    constructor(private readonly usuarioRepository: IUsuarioRepository) {
        void this.usuarioRepository;
    }

    async execute(data: {
        nombre: string;
        email: string;
        concesionariaId?: number | null;
        sucursalId?: number | null;
        roleIds?: number[];
        // Compat: si llega `roles: string[]`, se ignora aquí (el caller
        // debe migrarse a roleIds). Quitar cuando ningún caller lo use.
        roles?: string[];
    }) {
        if (!data.email) {
            throw new BaseException(400, 'El email es obligatorio', 'VALIDATION_ERROR');
        }
        if (!data.nombre) {
            throw new BaseException(400, 'El nombre es obligatorio', 'VALIDATION_ERROR');
        }
        if (!data.roleIds || data.roleIds.length === 0) {
            throw new BaseException(400, 'Debe asignarse al menos un rol (roleIds)', 'VALIDATION_ERROR');
        }
        if (!data.concesionariaId) {
            throw new BaseException(400, 'concesionariaId es obligatorio', 'VALIDATION_ERROR');
        }

        // Solo super_admin puede crear otros super_admin. Un admin de
        // concesionaria que intente asignar el rol super_admin recibe 403.
        const currentUser = context.getUser();
        const isSuperAdmin = currentUser?.roles?.includes('super_admin') ?? false;
        if (!isSuperAdmin) {
            const superAdminRol = await prisma.rol.findUnique({ where: { nombre: 'super_admin' } });
            if (superAdminRol && data.roleIds.includes(superAdminRol.id)) {
                throw new BaseException(
                    403,
                    'Solo un super_admin puede asignar el rol super_admin.',
                    'FORBIDDEN_ROLE_ASSIGNMENT',
                );
            }
        }

        const invitadoPor = currentUser?.userId;

        return inviteUsuario({
            nombre: data.nombre,
            email: data.email,
            concesionariaId: data.concesionariaId,
            sucursalId: data.sucursalId ?? null,
            roleIds: data.roleIds,
            invitadoPorUsuarioId: invitadoPor,
        });
    }
}
