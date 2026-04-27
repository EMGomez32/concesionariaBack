import { IVehiculoMovimientoRepository } from '../../../domain/repositories/IVehiculoMovimientoRepository';

export class CreateMovimiento {
    constructor(private readonly repository: IVehiculoMovimientoRepository) { }

    async execute(data: any) {
        return this.repository.create(data);
    }
}
