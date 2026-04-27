import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { BaseException, NotFoundException } from '../../../domain/exceptions/BaseException';
import bcrypt from 'bcrypt';
import prisma from '../../../infrastructure/database/prisma';
import { context } from '../../../infrastructure/security/context';

export class UpdateUsuario {
    constructor(private readonly usuarioRepository: IUsuarioRepository) { }

    async execute(id: number, data: any) {
        const exists: any = await this.usuarioRepository.findById(id);
        if (!exists) {
            throw new NotFoundException('Usuario');
        }

        const { password, ...updateData } = data;

        // HU-11: si cambia el email, validar unicidad antes de tirar P2002.
        if (updateData.email && updateData.email !== exists.email) {
            const dup = await this.usuarioRepository.findByEmailInConcesionaria(
                updateData.email,
                exists.concesionariaId
            );
            if (dup && dup.id !== id) {
                throw new BaseException(
                    409,
                    `Ya existe otro usuario con email ${updateData.email} en esta concesionaria`,
                    'EMAIL_DUPLICATED'
                );
            }
        }

        // Solo super_admin puede asignar/quitar el rol super_admin a otros.
        if (Array.isArray(updateData.roleIds)) {
            const currentUser = context.getUser();
            const isSuperAdmin = currentUser?.roles?.includes('super_admin') ?? false;
            if (!isSuperAdmin) {
                const superAdminRol = await prisma.rol.findUnique({ where: { nombre: 'super_admin' } });
                if (superAdminRol && updateData.roleIds.includes(superAdminRol.id)) {
                    throw new BaseException(
                        403,
                        'Solo un super_admin puede asignar el rol super_admin.',
                        'FORBIDDEN_ROLE_ASSIGNMENT',
                    );
                }
            }
        }

        if (password) {
            (updateData as any).passwordHash = await bcrypt.hash(password, 10);
        }

        return this.usuarioRepository.update(id, updateData);
    }
}
