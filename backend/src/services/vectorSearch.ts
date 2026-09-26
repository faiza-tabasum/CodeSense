import { pool } from "../db";
import { ChunkWithEmbedding, RetrievedChunk } from "../types";

// MVP retrieval: brute-force cosine similarity computed in Node, over
// every chunk belonging to a repo. This is fine at hundreds of chunks
// (single-digit milliseconds) and is exactly the piece to replace with a
// real vector DB (Chroma/Qdrant) once repos get large — see NEXT_STEPS.md #2.
// The interface below (`retrieveTopK`) is deliberately the seam where that
// swap happens, so the rest of the app doesn't need to change.

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function loadRepoChunks(repoId: number): Promise<ChunkWithEmbedding[]> {
  const [rows] = await pool.query(
    "SELECT file_path, chunk_index, content, embedding FROM chunks WHERE repo_id = ?",
    [repoId]
  );
  return (rows as any[]).map((row) => ({
    filePath: row.file_path,
    chunkIndex: row.chunk_index,
    content: row.content,
    embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding,
  }));
}

export async function retrieveTopK(
  repoId: number,
  queryEmbedding: number[],
  k = 6
): Promise<RetrievedChunk[]> {
  const chunks = await loadRepoChunks(repoId);
  const scored: RetrievedChunk[] = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
