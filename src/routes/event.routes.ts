import { Router } from "express";

import { z } from "zod";

import { requireOrganization, type AuthenticatedRequest } from "../middlewares/auth";

import { createEventSchema } from "../schemas/event.schema";

import { createEvent } from "../services/event.service";


const router = Router();

router.post(
    "/",
    requireOrganization,
    async (req: AuthenticatedRequest, res, next) => {
        try {

            const input = createEventSchema.parse(req.body);

            const organizationId = req.organizationId;

            const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

            const result = await createEvent({
                organizationId,
                input,
                idempotencyKey,
            });

            return res.status(result.duplicate ? 200 : 201).json({
                data: {
                    event: {
                        id: result.event.id,
                        type: result.event.eventType,
                        createdAt: result.event.createdAt,
                    },


                    deliveryJobs: result.deliveryJobs.map((job) => ({

                        id: job.id,
                        endpointId: job.endpointId,
                        status: job.status,
                    })),
                },

                meta: {
                    duplicate: result.duplicate,
                },

            });




        } catch (error) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: {
                        code: "VALIDATION ERROR",
                        message: "Invalid request body",
                        details: error.issues,
                    },
                });
            }

            next(error);

        }
    }
);

export default router;

