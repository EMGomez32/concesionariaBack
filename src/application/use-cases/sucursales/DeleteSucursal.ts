import { ISucursalRepository } from '../../../domain/repositories/ISucursalRepository';
import { NotFoundException } from '../../../domain/exceptions/BaseException';

export class DeleteSucursal {
    constructor(private readonly sucursalRepository: ISucursalRepository) { }

    async execute(id: number) {
        const exists = await this.sucursalRepository.findById(id);
        if (!exists) {
            throw new NotFoundException('Sucursal');
        }
        return this.sucursalRepository.delete(id);
    }
}
