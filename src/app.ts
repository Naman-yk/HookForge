import express from "express";
import eventRoutes from "./routes/event.routes";

const app = express();

app.use(express.json({
    limit: "1mb",
}));


app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "OK",
        service: "HookForge-api",

    })
})

app.use("/v1/events", eventRoutes);

app.use(
    (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        console.error(error);

        res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Internal Server Error",
            },
        });
    }

)



export default app;