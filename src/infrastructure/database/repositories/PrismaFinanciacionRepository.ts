import { IFinanciacionRepository } from '../../../domain/repositories/IFinanciacionRepository';
import { Financiacion, Cuota } from '../../../domain/entities/Financiacion';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaFinanciacionRepository implements IFinanciacionRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Financiacion>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.financiacion.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                venta: { include: { vehiculo: true } },
                cuotasPlan: true
            }
        });

        const total = await prisma.financiacion.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Financiacion | null> {
        const f = await prisma.financiacion.findUnique({
            where: { id },
            include: { cuotasPlan: true, venta: true }
        });
        return f ? this.mapToEntity(f) : null;
    }

    async update(id: number, data: any): Promise<Financiacion> {
        const f = await prisma.financiacion.update({
            where: { id },
            data,
            include: { cuotasPlan: true, venta: true },
        });
        return this.mapToEntity(f);
    }

    async findCuotaById(id: number): Promise<Cuota | null> {
        const c = await prisma.cuota.findUnique({ where: { id } });
        return c ? this.mapCuotaToEntity(c) : null;
    }

    async updateCuota(id: number, data: any): Promise<Cuota> {
        const c = await prisma.cuota.update({
            where: { id },
            data,
        });
        return this.mapCuotaToEntity(c);
    }

    async createPagoCuota(data: any): Promise<void> {
        await prisma.pagoCuota.create({ data });
    }

    async create(data: any): Promise<Financiacion> {
        const { ventaId, clienteId, cobradorId, montoFinanciado, cuotas: cuotasCount, diaVencimiento, fechaInicio, concesionariaId } = data;
        const montoCuota = parseFloat(montoFinanciado) / parseInt(cuotasCount, 10);

        return prisma.$transaction(async (tx) => {
            const f = await tx.financiacion.create({
                data: {
                    ventaId,
                    clienteId,
                    cobradorId,
                    montoFinanciado,
                    cuotas: cuotasCount,
                    diaVencimiento,
                    fechaInicio: new Date(fechaInicio),
                    concesionariaId
                }
            });

            const cuotasData = [];
            for (let i = 1; i <= cuotasCount; i++) {
                const fechaVence = new Date(fechaInicio);
                fechaVence.setMonth(fechaVence.getMonth() + i);
                fechaVence.setDate(diaVencimiento);

                cuotasData.push({
                    financiacionId: f.id,
                    nroCuota: i,
                    montoCuota: montoCuota,
                    saldoCuota: montoCuota,
                    vencimiento: fechaVence,
                    estado: 'pendiente' as any
                });
            }

            await tx.cuota.createMany({ data: cuotasData });

            const fComplete = await tx.financiacion.findUnique({
                where: { id: f.id },
                include: { cuotasPlan: true }
            });
            return this.mapToEntity(fComplete);
        });
    }

    private mapToEntity(f: any): Financiacion {
        return new Financiacion(
            f.id,
            f.concesionariaId,
            f.ventaId,
            f.clienteId,
            f.cobradorId,
            Number(f.montoFinanciado),
            f.cuotas,
            f.diaVencimiento,
            f.fechaInicio,
            f.estado,
            f.createdAt,
            f.updatedAt,
            f.deletedAt,
            f.venta,
            f.cuotasPlan
        );
    }

    private mapCuotaToEntity(c: any): Cuota {
        return new Cuota(
            c.id,
            c.financiacionId,
            c.nroCuota,
            Number(c.montoCuota),
            Number(c.saldoCuota),
            c.vencimiento,
            c.estado,
            c.createdAt,
            c.updatedAt
        );
    }
}
