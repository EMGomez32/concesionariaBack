import { Prisma } from '@prisma/client';

export const softDeleteExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        name: 'softDelete',
        query: {
            $allModels: {
                async delete({ model, args, query }) {
                    return (client as any)[model].update({
                        ...args,
                        data: { deletedAt: new Date() },
                    });
                },
                async deleteMany({ model, args, query }) {
                    return (client as any)[model].updateMany({
                        ...args,
                        data: { deletedAt: new Date() },
                    });
                },
                async findUnique({ model, args, query }) {
                    args.where = { ...args.where, deletedAt: null } as any;
                    return query(args);
                },
                async findFirst({ model, args, query }) {
                    args.where = { ...args.where, deletedAt: null } as any;
                    return query(args);
                },
                async findMany({ model, args, query }) {
                    args.where = { ...args.where, deletedAt: null } as any;
                    return query(args);
                },
                async count({ model, args, query }) {
                    args.where = { ...args.where, deletedAt: null } as any;
                    return query(args);
                },
            },
        },
    });
});
