import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ingestRouter } from "./routes/ingest";
import { askRouter } from "./routes/ask";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api", ingestRouter);
app.use("/api", askRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CodeSense backend running on http://localhost:${PORT}`);
});
