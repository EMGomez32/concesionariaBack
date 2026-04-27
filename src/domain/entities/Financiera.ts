export class Financiera {
    constructor(
        public readonly id: number,
        public readonly concesionariaId: number,
        public readonly nombre: string,
        public readonly descripcion: string | null,
        public readonly contacto: string | null,
        public readonly telefono: string | null,
        public readonly email: string | null,
        public readonly direccion: string | null,
        public readonly activo: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly deletedAt: Date | null
    ) { }
}
