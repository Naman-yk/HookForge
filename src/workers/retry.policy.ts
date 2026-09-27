const BASE_DELAY_MS = 1_000;

const MAX_DELAY_MS = 5 * 60_000;

export function calculateRetryDelay(attemptNumber: number): number {

    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attemptNumber - 1);

    const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);


    const jitter = Math.random() * cappedDelay * 0.2;

    return Math.floor(cappedDelay + jitter);



}
// this is thundering herd prevention.