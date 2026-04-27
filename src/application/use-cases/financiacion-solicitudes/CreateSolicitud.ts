import { ISolicitudFinanciacionRepository } from '../../../domain/repositories/ISolicitudFinanciacionRepository';

export class CreateSolicitud {
    constructor(private readonly repository: ISolicitudFinanciacionRepository) { }

    async execute(data: any) {
        return this.repository.create(data);
    }
}
