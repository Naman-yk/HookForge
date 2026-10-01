
// we are going to make deiverJobs() return normally while runWorker() maintains a set of active jobs 
// like our goal is to set concurrency so our workers don't work on more than 5 jobs at a time


import { randomUUID } from "node:crypto";

import { prisma } from "../lib/prisma";

import { claimNextJob } from "./jobclaim";
import { resolve } from "node:dns";

import { calculateRetryDelay } from "./retry.policy";

import { isRetryableStatus } from "./retry.classifier";

import { startLeaseRefresh } from "./job.lease-manager";

import { WORKER_CONFIG } from "./worker.config";


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

    const stopLeaseRefresh = startLeaseRefresh(job.id, WORKER_ID);


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


    }, WORKER_CONFIG.deliveryTimeoutMs);

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


        const retryable = isRetryableStatus(response.status);

        const nextAttemptNumber = job.attemptCount + 1;

        const attemptsExhausted = nextAttemptNumber >= job.maxAttempts;

        let nextStatus: "DELIVERED" | "RETRYING" | "DEAD_LETTER";

        let nextAvailableAt = new Date();

        let lastError: string | null = null;

        if (response.ok) {
            nextStatus = "DELIVERED";
            lastError = null;
        } else if (!retryable) {
            nextStatus = "DEAD_LETTER";
            lastError = `Receiver returned non-returnable HTTP ${response.status}`;

        } else if (attemptsExhausted) {
            nextStatus = "DEAD_LETTER";
            lastError = `Maximum delivery attempts (${job.maxAttempts}) exceeded`;

        } else {

            nextStatus = "RETRYING";

            const delay = calculateRetryDelay(nextAttemptNumber);

            nextAvailableAt = new Date(
                Date.now() + delay
            );

            lastError = `Receiver returned retyable HTTP ${response.status}`;

            console.log(
                `[${WORKER_ID}] Job ${job.id} will retry in ${delay}ms`
            );

        }




        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },
            data: {
                attemptCount: {
                    increment: 1,
                },

                status: nextStatus,

                lastError,

                lockedAt: null,
                lockedBy: null,

                availableAt: nextAvailableAt,
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

        const nextAttemptNumber = job.attemptCount + 1;

        const attemptsExhausted = nextAttemptNumber >= job.maxAttempts;

        const delay = calculateRetryDelay(nextAttemptNumber);

        const nextStatus = attemptsExhausted ? "DEAD_LETTER" : "RETRYING";

        const nextAvailableAt = attemptsExhausted ? new Date() : new Date(
            Date.now() + delay
        );

        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },

            data: {
                attemptCount: {
                    increment: 1,
                },

                status: nextStatus,


                lastError: message,

                lockedAt: null,
                lockedBy: null,

                availableAt: new Date(Date.now() + 60_000),



            },
        });

        if (attemptsExhausted) {
            console.error(
                `[${WORKER_ID}] Job ${job.id} ` +
                `moved to DEAD_LETTER after ` +
                `${nextAttemptNumber} attempts`
            );
        } else {
            console.error(
                `[${WORKER_ID}] Job ${job.id} ` +
                `failed: ${message}. ` +
                `Retrying in ${delay}ms`
            );

        }


    } finally {
        clearTimeout(timeout);

        stopLeaseRefresh();
    }


}

async function runWorker() {
    console.log(`🚚 ${WORKER_ID} started`);

    const activeJobs = new Set<Promise<void>>();

    while (true) {
        try {
            while (activeJobs.size < WORKER_CONFIG.maxConcurrency) {

                const job = await claimNextJob(WORKER_ID);

                if (!job) {
                    break;
                }

                const jobPromise = deliverJob(job.id).catch((error) => {
                    console.error(`[${WORKER_ID}] Job ${job.id} crashed:`, error);


                }).finally(() => {
                    activeJobs.delete(jobPromise);

                });
                activeJobs.add(jobPromise);


            }

            if (activeJobs.size === 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, WORKER_CONFIG.pollIntervalMs)
                );
                continue;
            }
            await Promise.race(activeJobs);

        } catch (error) {
            console.error(`[${WORKER_ID}] Worker error:`, error);

            await new Promise((resolve) =>
                setTimeout(resolve, WORKER_CONFIG.pollIntervalMs)

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