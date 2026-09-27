import { CohereEmbeddings } from "@langchain/cohere";

let embedder: CohereEmbeddings | null = null;

function getEmbedder(): CohereEmbeddings {
  if (!embedder) {
    embedder = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY,
      model: "embed-english-v3.0",
      inputType: "search_document",
    });
  }
  return embedder;
}

const BATCH_SIZE = 20;

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