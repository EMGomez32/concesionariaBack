import { IVehiculoRepository } from '../../../domain/repositories/IVehiculoRepository';
import { NotFoundException } from '../../../domain/exceptions/BaseException';
import { assertValidTransition } from '../../../domain/services/stateMachine';

export class UpdateVehiculo {
    constructor(private readonly vehiculoRepository: IVehiculoRepository) { }

    async execute(id: number, data: any) {
        const exists: any = await this.vehiculoRepository.findById(id);
        if (!exists) {
            throw new NotFoundException('Vehículo');
        }

        if (data.estado && data.estado !== exists.estado) {
            assertValidTransition('vehiculo', exists.estado, data.estado);
        }

        return this.vehiculoRepository.update(id, data);
    }
}
