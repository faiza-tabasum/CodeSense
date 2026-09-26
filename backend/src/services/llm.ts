import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RetrievedChunk } from "../types";

// Built with LangChain primitives directly (prompt template -> model ->
// parser) rather than a black-box RetrievalQAChain, so the pipeline is easy
// to explain step by step: this IS the chain, just written out.

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

let model: ChatOpenAI | null = null;

function getModel(): ChatOpenAI {
  if (!model) {
    model = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
      apiKey: process.env.OPENAI_API_KEY,
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
