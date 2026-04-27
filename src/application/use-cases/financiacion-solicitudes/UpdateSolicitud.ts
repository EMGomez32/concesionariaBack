import { ISolicitudFinanciacionRepository } from '../../../domain/repositories/ISolicitudFinanciacionRepository';
import { NotFoundException } from '../../../domain/exceptions/BaseException';
import { assertValidTransition } from '../../../domain/services/stateMachine';

export class UpdateSolicitud {
    constructor(private readonly repository: ISolicitudFinanciacionRepository) { }

    async execute(id: number, data: any) {
        const exists: any = await this.repository.findById(id);
        if (!exists) throw new NotFoundException('Solicitud de financiación');

        const patch = { ...data };

        if (patch.estado && patch.estado !== exists.estado) {
            assertValidTransition('solicitudFinanciacion', exists.estado, patch.estado);

            // Auto-fill timestamps according to the destination state.
            const now = new Date();
            if (patch.estado === 'enviada' && !patch.fechaEnvio && !exists.fechaEnvio) {
                patch.fechaEnvio = now;
            }
            if ((patch.estado === 'aprobada' || patch.estado === 'rechazada') && !patch.fechaRespuesta) {
                patch.fechaRespuesta = now;
            }
        }

        return this.repository.update(id, patch);
    }
}
