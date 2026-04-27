export class Presupuesto {
    constructor(
        public readonly id: number,
        public readonly concesionariaId: number,
        public readonly sucursalId: number,
        public readonly clienteId: number,
        public readonly vendedorId: number,
        public readonly vehiculoId: number | null,
        public readonly nroPresupuesto: string,
        public readonly fecha: Date,
        public readonly subtotal: number,
        public readonly total: number,
        public readonly estado: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly deletedAt: Date | null,
        public readonly cliente?: any,
        public readonly vendedor?: any,
        public readonly items?: any[]
    ) { }
}
