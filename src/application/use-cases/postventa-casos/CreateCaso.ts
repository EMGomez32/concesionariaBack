import { IPostventaCasoRepository } from '../../../domain/repositories/IPostventaCasoRepository';

export class CreateCaso {
    constructor(private readonly repository: IPostventaCasoRepository) { }

    async execute(data: any) {
        return this.repository.create(data);
    }
}
