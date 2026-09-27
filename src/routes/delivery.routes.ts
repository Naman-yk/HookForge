import { Router } from "express";

import next from "express";

import { replayDeliveryJob } from "../services/delivery-replay.service";


const router = Router();



router.post(
    "/:jobId/replay", async (req, res) => {
        try {
            const job = await replayDeliveryJob(req.params.jobId);

            return res.status(200).json({
                data: {
                    job: {
                        id: job.id,
                        status: job.status,

                        attemptCount: job.attemptCount,

                        availableAt: job.availableAt,
                    },
                },
            });


        } catch (error) {
            next(error);
        }
    }
);

export default router;