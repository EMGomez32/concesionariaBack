export class PostventaCaso {
    constructor(
        public readonly id: number,
        public readonly concesionariaId: number,
        public readonly sucursalId: number,
        public readonly clienteId: number,
        public readonly vehiculoId: number,
        public readonly ventaId: number,
        public readonly fechaReclamo: Date,
        public readonly tipo: string | null,
        public readonly descripcion: string,
        public readonly estado: string,
        public readonly fechaCierre: Date | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly deletedAt: Date | null,
        public readonly cliente?: any,
        public readonly vehiculo?: any,
        public readonly sucursal?: any,
        public readonly items?: any[]
    ) { }
}
