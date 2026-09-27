import express from "express";

const app = express();


app.use(express.json());



app.post("/webhooks/a", (req, res) => {
    console.log("Receiver A got:");

    console.log(req.body);

    res.status(200).json({
        received: true,
        receiver: "A",
    });
});

app.post("/webhooks/b", (req, res) => {
    console.log("Receiver B got");

    console.log(req.body);


    res.status(200).json({
        received: true,
        receiver: "B",
    });
});

const PORT = 4089;

app.listen(PORT, () => {
    console.log(`Test server is running on the ${PORT}`);
});