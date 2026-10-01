import { prisma } from "../lib/prisma";


export async function refreshJobLease(
    jobId: string,

    workerId: string
): Promise<boolean> {

    const result = await prisma.deliveryJob.updateMany({
        where: {
            id: jobId,
            status: "PROCESSING",
            lockedBy: workerId,
        },

        data: {
            lockedAt: new Date(),
        },
    });


    return result.count === 1;
}