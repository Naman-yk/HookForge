import { prisma } from "../lib/prisma";


export interface ClaimedJob {
  id: string;
  eventId: string;
  endpointId: string;
}


const LEASE_DURATION_MS = 30_000;


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
       
     )
     OR(

     "status" = 'PROCESSING'
     AND "lockedAt" IS NOT NULL
     AND "lockedAt" < NOW() - (${LEASE_DURATION_MS} * INTERVAL  'millisecond')

     
     )

     ORDER BY
      CASE 
       WHEN "status" = 'PROCESSING' THEN 1
       ELSE 0
       END,
       "availableAt" ASC,
       "createdAt" ASC

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

  // WHAT WE are doing here we are creating a new case for processing + expired lease for those workers who have died midways
  //to become new candidates so new worker can pick them up again.


}