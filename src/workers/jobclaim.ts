import { prisma } from "../lib/prisma";


export interface ClaimedJob {
    id: string;
    eventId: string;
    endpointId: string;
}

export async function claimNextJob(
    workerId: string
): Promise<ClaimedJob | null> {

    const jobs = await prisma.$queryRaw<ClaimedJob[]> `

    UPDATE "DeliveryJob"
    SET
     "status" = 'PROCESSING',
     "lockedAt" = NOW(),

     "lockedBy" = ${workerId},

     "updatedAt" = NOW()

     WHERE "id" = (
     SELECT "id"
     FROM "DeliveryJob"
     WHERE
       "status" IN ('PENDING' , 'RETRYING')
       AND "availableAt" <=NOW()
       AND "lockedAt" IS NULL
       ORDER BY "availableAt" ASC, "createdAt" ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
       RETURNING 
       "id",
       "eventId"
       "endpointId"

    
    
    
    
    `;

    return jobs[0] ?? null;

    // why we are using this postgres locking system 
    // say two workers asked for process allotment at the same time we do not want to allocate 

}