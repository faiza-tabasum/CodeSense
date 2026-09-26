import { OpenAIEmbeddings } from "@langchain/openai";

let embedder: OpenAIEmbeddings | null = null;

function getEmbedder(): OpenAIEmbeddings {
  if (!embedder) {
    embedder = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return embedder;
}

// Batches to stay well under request-size limits. Sequential batches, not
// fully parallel — simple and predictable for an MVP; revisit if ingestion
// speed becomes the complaint.
const BATCH_SIZE = 50;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = getEmbedder();
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const vectors = await embedder.embedDocuments(batch);
    results.push(...vectors);
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embedder = getEmbedder();
  return embedder.embedQuery(text);
}
