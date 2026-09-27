import { Router, Request, Response } from "express";
import { pool } from "../db";
import { embedQuery } from "../services/embeddings";
import { retrieveTopK } from "../services/vectorSearch";
import { answerQuestion } from "../services/llm";

export const askRouter = Router();

askRouter.post("/ask", async (req: Request, res: Response) => {
  const { repoId, question } = req.body as { repoId?: number; question?: string };
  if (!repoId || !question) {
    return res.status(400).json({ error: "repoId and question are required" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM repos WHERE id = ?", [repoId]);
    const repo = (rows as any[])[0];
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    if (repo.status !== "ready") {
      return res.status(409).json({ error: `Repo is not ready yet (status: ${repo.status})` });
    }

    const queryEmbedding = await embedQuery(question);
    const topChunks = await retrieveTopK(repoId, queryEmbedding, 6);

    if (topChunks.length === 0) {
      return res.json({ answer: "No relevant code found for that question.", sources: [] });
    }

    const answer = await answerQuestion(question, topChunks);
    const sources = topChunks.map((c) => ({ filePath: c.filePath, score: Number(c.score.toFixed(3)) }));

    await pool.query(
      "INSERT INTO queries (repo_id, question, answer, source_files) VALUES (?, ?, ?, ?)",
      [repoId, question, answer, JSON.stringify(sources)]
    );

    res.json({ answer, sources });
  } catch (err: any) {
    console.error("Ask failed:", err);
    res.status(500).json({
      error: err.message || "Failed to generate an answer. Check server logs and that DB/API keys are configured correctly.",
    });
  }
});