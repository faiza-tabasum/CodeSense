import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RetrievedChunk } from "../types";

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a code assistant answering questions about a specific GitHub
repository. Answer ONLY using the provided context chunks. If the context
doesn't contain enough information to answer confidently, say so plainly
instead of guessing.

Cite which file(s) your answer relies on inline, like: (see: src/foo.ts).

Context chunks:
{context}`,
  ],
  ["human", "{question}"],
]);

let model: ChatGroq | null = null;

function getModel(): ChatGroq {
  if (!model) {
    model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-20b",
      temperature: 0.1,
    });
  }
  return model;
}

function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] File: ${chunk.filePath} (chunk ${chunk.chunkIndex})\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}

export async function answerQuestion(
  question: string,
  contextChunks: RetrievedChunk[]
): Promise<string> {
  const chain = promptTemplate.pipe(getModel()).pipe(new StringOutputParser());
  return chain.invoke({
    question,
    context: formatContext(contextChunks),
  });
}