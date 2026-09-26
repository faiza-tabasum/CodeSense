import { Router, Request, Response } from "express";
import { pool } from "../db";
import { parseRepoUrl, fetchRepoFiles } from "../services/github";
import { chunkFiles } from "../services/chunker";
import { embedTexts } from "../services/embeddings";

export const ingestRouter = Router();

ingestRouter.post("/ingest", async (req: Request, res: Response) => {
  const { repoUrl } = req.body as { repoUrl?: string };
  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  let owner: string, repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(repoUrl));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const fullName = `${owner}/${repo}`;
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query(
      "SELECT id, status FROM repos WHERE full_name = ?",
      [fullName]
    );
    const existing = (existingRows as any[])[0];
    if (existing && existing.status === "ready") {
      return res.json({ repoId: existing.id, status: "ready", cached: true });
    }

    let repoId: number;
    if (existing) {
      repoId = existing.id;
      await conn.query("UPDATE repos SET status = 'ingesting' WHERE id = ?", [repoId]);
      await conn.query("DELETE FROM chunks WHERE repo_id = ?", [repoId]);
    } else {
      const [result] = await conn.query(
        "INSERT INTO repos (owner, name, full_name, status) VALUES (?, ?, ?, 'ingesting')",
        [owner, repo, fullName]
      );
      repoId = (result as any).insertId;
    }

    // Respond fast; do the actual work after. For an MVP with small repos
    // this finishes in seconds, but this is the seam where you'd introduce
    // a job queue (NEXT_STEPS.md #6) if ingestion time grows.
    res.json({ repoId, status: "ingesting" });

    try {
      const files = await fetchRepoFiles(owner, repo);
      const chunks = chunkFiles(files);

      if (chunks.length === 0) {
        await conn.query("UPDATE repos SET status = 'failed' WHERE id = ?", [repoId]);
        return;
      }

      const embeddings = await embedTexts(chunks.map((c) => c.content));

      for (let i = 0; i < chunks.length; i++) {
        await conn.query(
          "INSERT INTO chunks (repo_id, file_path, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?)",
          [repoId, chunks[i].filePath, chunks[i].chunkIndex, chunks[i].content, JSON.stringify(embeddings[i])]
        );
      }

      await conn.query(
        "UPDATE repos SET status = 'ready', file_count = ?, chunk_count = ? WHERE id = ?",
        [files.length, chunks.length, repoId]
      );
    } catch (bgErr) {
      console.error("Ingestion failed:", bgErr);
      await conn.query("UPDATE repos SET status = 'failed' WHERE id = ?", [repoId]);
    }
  } finally {
    conn.release();
  }
});

ingestRouter.get("/repos/:id/status", async (req: Request, res: Response) => {
  const [rows] = await pool.query("SELECT * FROM repos WHERE id = ?", [req.params.id]);
  const repo = (rows as any[])[0];
  if (!repo) return res.status(404).json({ error: "Repo not found" });
  res.json(repo);
});
