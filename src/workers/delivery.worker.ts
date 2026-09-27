import { randomUUID } from "node:crypto";

import { prisma } from "../lib/prisma";

import { claimNextJob } from "./jobclaim";
import { resolve } from "node:dns";


const WORKER_ID = `worker-${randomUUID()}`;

const POLL_INTERVAL_MS = 1000;

const DELIVERY_TIMEOUT_MS = 5000;


async function deliverJob(jobId: string) {

    const job = await prisma.deliveryJob.findUnique({
        where: {
            id: jobId,
        },
        include: {
            event: true,
            endpoint: true,
        },
    });

    if (!job) {
        throw new Error(`Delivery job ${jobId} not found`);

    }

    const startedAt = new Date();

    const attempt = await prisma.deliveryAttempt.create({
        data: {
            deliveryJobId: job.id,
            attemptNumber: job.attemptCount + 1,
            startedAt,
        },
    });

    const controller = new AbortController();


    const timeout = setTimeout(() => {
        controller.abort();


    }, DELIVERY_TIMEOUT_MS);

    try {
        const response = await fetch(job.endpoint.url, {
            method: "POST",

            headers: {

                "Content-Type": "application/json",
                "X-Forge-Event": job.event.eventType,

                "X-HookForge-Event-Id": job.event.id,





            },

            body: JSON.stringify(job.event.payload),

            signal: controller.signal,
        });

        const responseBody = await response.text();

        const completedAt = new Date();

        await prisma.deliveryAttempt.update({
            where: {
                id: attempt.id,
            },
            data: {
                statusCode: response.status,
                responseBody: responseBody.slice(0, 10_000),
                completedAt,
                durationMs: completedAt.getTime() - startedAt.getTime(),
            },
        });

        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },
            data: {
                attemptCount: {
                    increment: 1,
                },

                status: response.ok ? "DELIVERED" : "RETRYING",

                lastError: response.ok ? null : `Receiver returned HTTP ${response.status}`,

                lockedAt: null,
                lockedBy: null,

                availableAt: response.ok ? new Date() : new Date(Date.now() + 60_000),
            },
        });

        console.log(
            `[${WORKER_ID}] Job ${job.id} → HTTP ${response.status}`
        );



    } catch (error) {
        const completedAt = new Date();

        const message = error instanceof Error ? error.message : String(error);

        await prisma.deliveryAttempt.update({
            where: {
                id: attempt.id,
            },

            data: {
                errorMessage: message,
                completedAt,

                durationMs: completedAt.getTime() - startedAt.getTime(),
            },
        });

        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },

            data: {
                attemptCount: {
                    increment: 1,
                },

                status: "RETRYING",

                lastError: message,

                lockedAt: null,
                lockedBy: null,

                availableAt: new Date(Date.now() + 60_000),



            },
        });

        console.error(
            `[${WORKER_ID}] Job ${job.id} failed: ${message}`

        );
    } finally {
        clearTimeout(timeout);
    }


}

async function runWorker() {
    console.log(`🚚 ${WORKER_ID} started`);

    while (true) {
        try {
            const job = await claimNextJob(WORKER_ID);

            if (!job) {
                await new Promise((resolve) =>
                    setTimeout(resolve, POLL_INTERVAL_MS)
                );

                continue;
            }

            await deliverJob(job.id);
        } catch (error) {
            console.error(`[${WORKER_ID}] Worker error:`, error);

            await new Promise((resolve) =>
                setTimeout(resolve, POLL_INTERVAL_MS)
            );
        }
    }
}

runWorker()
    .catch((error) => {
        console.error("Fatal worker error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });