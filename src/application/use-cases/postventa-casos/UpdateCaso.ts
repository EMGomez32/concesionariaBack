import { IPostventaCasoRepository } from '../../../domain/repositories/IPostventaCasoRepository';
import { NotFoundException } from '../../../domain/exceptions/BaseException';
import { assertValidTransition } from '../../../domain/services/stateMachine';

export class UpdateCaso {
    constructor(private readonly repository: IPostventaCasoRepository) { }

    async execute(id: number, data: any) {
        const exists: any = await this.repository.findById(id);
        if (!exists) throw new NotFoundException('Caso de postventa');

        const patch = { ...data };

        if (patch.estado && patch.estado !== exists.estado) {
            assertValidTransition('postventa', exists.estado, patch.estado);
            if (patch.estado === 'resuelto' && !exists.fechaCierre && !patch.fechaCierre) {
                patch.fechaCierre = new Date();
            }
        }

        return this.repository.update(id, patch);
    }
}
