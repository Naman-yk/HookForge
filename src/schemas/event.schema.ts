import { z } from "zod";

export const createEventSchema = z.object({
    eventType: z
        .string()
        .min(1, "eventType is required")
        .max(100, "eventType is too long")

        .regex(
            /^[a-zA-Z0-9._-]+$/,
            "eventType may only contain letters, numbers, dots, underscores and hyphens"

        ),

    payload: z
        .record(z.string(), z.unknown()),
});


export type CreateEventInput = z.infer<typeof createEventSchema>;
