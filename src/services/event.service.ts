import { prisma } from "../lib/prisma";

import type { CreateEventInput } from "../schemas/event.schema";


interface CreateEventParams {
    organizationId: string;
    input: CreateEventInput;
    idempotencyKey?: string;

}


export async function createEvent({
    organizationId,
    input,
    idempotencyKey,

}: CreateEventParams) {

    if (idempotencyKey) {
        const existingEvent = await prisma.event.findFirst({
            where: {
                organizationId,
                idempotencyKey,

            },
            include: {
                deliveryJobs: true,
            },
        });

        if (existingEvent) {
            return {
                event: existingEvent,
                duplicate: true,
            };
        }
    }

    const endpoints = await prisma.endpoint.findMany({
        where: {
            organizationId,
            isActive: true,
        }
    });

    const result = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                organizationId,
                eventType: input.eventType,
                payload: input.payload,
                idempotencyKey,

            },
        });

        if (endpoints.length === 0) {
            return {
                event,
                deliveryJobs: [],
            };
        }

        const deliveryJobs = await Promise.all(
            endpoints.map((endpoint) => {
                tx.deliveryJob.create({
                    data: {
                        eventId: event.id,
                        endpointId: endpoint.id,
                        status: "PENDING",
                        availableAt: new Date()
                    },
                })
            })
        );

        return {
            event,
            deliveryJobs,
        };



    });

    return {
        ...result,
        duplicate: false,
    }


}




