import { ICategoriaGastoRepository } from '../../../domain/repositories/ICategoriaGastoRepository';

export class GetCategoriasGasto {
    constructor(private readonly repository: ICategoriaGastoRepository) { }

    async execute(concesionariaId: number) {
        return this.repository.findAll(concesionariaId);
    }
}
