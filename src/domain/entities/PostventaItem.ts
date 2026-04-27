export class PostventaItem {
    constructor(
        public readonly id: number,
        public readonly casoId: number,
        public readonly descripcion: string,
        public readonly monto: number,
        public readonly cantidad: number,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }
}
