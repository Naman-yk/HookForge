export function isRetryableStatus(statusCode: number) {
    if (statusCode == 408) {
        return true;
    }

    if (statusCode == 429) {
        return true;
    }


    return statusCode >= 500 && statusCode <= 599;
}



// why we are using this isRetryableStatus
//500 → retry
/*
502 → retry
503 → retry
504 → retry

408 → retry
429 → retry

400 → don't retry
401 → don't retry
403 → don't retry
404 → don't retry
422 → don't retry

*/

// network error- we are trying to retry cause we have network error

// timeout - retry
// connection refused- retry


