export class SolicitudFinanciacion {
    constructor(
        public readonly id: number,
        public readonly concesionariaId: number,
        public readonly clienteId: number,
        public readonly financieraId: number,
        public readonly monto: number,
        public readonly cuotas: number,
        public readonly estado: string,
        public readonly observaciones: string | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly deletedAt: Date | null,
        public readonly cliente?: any,
        public readonly financiera?: any
    ) { }
}
