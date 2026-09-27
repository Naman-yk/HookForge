import { prisma } from "../lib/prisma";


export async function replayDeliveryJob(

    jobId: string
) {

    const job = await prisma.deliveryJob.findUnique({
        where: {
            id: jobId,
        },
    });

    if (!job) {
        throw new Error(
            `Delivery job ${jobId} not found`
        );
    }


    if (job.status !== "DEAD_LETTER") {
        throw new Error(
            "Only DEAD_LETTER jobs can be replayed"
        );
    }

    const updated = await prisma.deliveryJob.update({
        where: {
            id: job.id,
        },

        data: {
            status: "PENDING",

            attemptCount: 0,

            availableAt: new Date(),

            lockedAt: null,

            lockedBy: null,

            lastError: null,
        },
    });

    return updated;
}