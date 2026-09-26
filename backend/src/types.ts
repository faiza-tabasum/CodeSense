export interface RepoRecord {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  status: "ingesting" | "ready" | "failed";
  file_count: number;
  chunk_count: number;
}

export interface FetchedFile {
  path: string;
  content: string;
}

export interface CodeChunk {
  filePath: string;
  chunkIndex: number;
  content: string;
}

export interface ChunkWithEmbedding extends CodeChunk {
  embedding: number[];
}

export interface RetrievedChunk extends ChunkWithEmbedding {
  score: number;
}

export interface AskResponse {
  answer: string;
  sources: { filePath: string; score: number }[];
}
