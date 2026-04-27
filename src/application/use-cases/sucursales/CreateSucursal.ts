import { ISucursalRepository } from '../../../domain/repositories/ISucursalRepository';
import { BaseException } from '../../../domain/exceptions/BaseException';

export class CreateSucursal {
    constructor(private readonly sucursalRepository: ISucursalRepository) { }

    async execute(data: any) {
        if (!data.nombre) {
            throw new BaseException(400, 'El nombre es obligatorio', 'VALIDATION_ERROR');
        }
        return this.sucursalRepository.create(data);
    }
}
