export class Financiacion {
    constructor(
        public readonly id: number,
        public readonly concesionariaId: number,
        public readonly ventaId: number,
        public readonly clienteId: number,
        public readonly cobradorId: number | null,
        public readonly montoFinanciado: number,
        public readonly cuotas: number,
        public readonly diaVencimiento: number,
        public readonly fechaInicio: Date,
        public readonly estado: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly deletedAt: Date | null,
        public readonly venta?: any,
        public readonly cuotasPlan?: any[]
    ) { }
}

export class Cuota {
    constructor(
        public readonly id: number,
        public readonly financiacionId: number,
        public readonly nroCuota: number,
        public readonly montoCuota: number,
        public readonly saldoCuota: number,
        public readonly vencimiento: Date,
        public readonly estado: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }
}
