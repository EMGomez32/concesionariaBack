import { IVehiculoRepository } from '../../../domain/repositories/IVehiculoRepository';
import { BaseException } from '../../../domain/exceptions/BaseException';

export class CreateVehiculo {
    constructor(private readonly vehiculoRepository: IVehiculoRepository) { }

    async execute(data: any) {
        if (!data.marca || !data.modelo) {
            throw new BaseException(400, 'Marca y modelo son obligatorios', 'VALIDATION_ERROR');
        }
        return this.vehiculoRepository.create(data);
    }
}
