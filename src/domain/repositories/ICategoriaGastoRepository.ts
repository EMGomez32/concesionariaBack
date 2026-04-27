import { CategoriaGasto } from '../entities/CategoriaGasto';

export interface ICategoriaGastoRepository {
    findAll(concesionariaId: number): Promise<CategoriaGasto[]>;
    findById(id: number): Promise<CategoriaGasto | null>;
    create(data: any): Promise<CategoriaGasto>;
    update(id: number, data: any): Promise<CategoriaGasto>;
    delete(id: number): Promise<void>;
    countGastos(id: number): Promise<number>;
}
