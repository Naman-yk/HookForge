import { refreshJobLease } from "./job.lease";

import { WORKER_CONFIG } from "./worker.config";


export function startLeaseRefresh(
    jobid: string, workerId: string
) {

    let stopped = false;


    const interval = setInterval(async () => {
        if (stopped) {
            return;

        }

        try {
            const refreshed = await refreshJobLease(jobid, workerId);

            if (!refreshed) {
                console.error(`[${workerId}] Lease for job ${jobid} could not be refreshed, likely stolen by another worker or job completed.`);

                clearInterval(interval);

            }



        } catch (error) {
            console.error(`[${workerId}] Failed to refresh lease for job ${jobId}:`, error);
        }
    }, WORKER_CONFIG.leaseRefreshMs);

    return () => {
        stopped = true;
        clearInterval(interval);
    }



}






