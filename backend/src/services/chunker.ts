import { CodeChunk, FetchedFile } from "../types";

// MVP chunking strategy.
//
// This is NOT AST-based (see NEXT_STEPS.md #1). It approximates
// function/class boundaries with a brace-depth heuristic for
// C-style languages, and falls back to fixed-size line windows for
// everything else (e.g. Python, Markdown). It's good enough to prove
// the retrieval pipeline works; it is not what you'd want to defend
// as "structurally aware chunking" in an interview without the tree-sitter
// upgrade.

const MAX_CHUNK_LINES = 60;
const OVERLAP_LINES = 5;

function chunkByBraceDepth(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let depth = 0;

  for (const line of lines) {
    current.push(line);
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
    const backAtTopLevel = depth <= 0;
    if (backAtTopLevel && current.length >= 8) {
      chunks.push(current);
      current = [];
      depth = 0;
    }
    if (current.length >= MAX_CHUNK_LINES) {
      chunks.push(current);
      current = [];
      depth = 0;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function chunkByFixedWindow(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    const end = Math.min(i + MAX_CHUNK_LINES, lines.length);
    chunks.push(lines.slice(i, end));
    if (end === lines.length) break;
    i = end - OVERLAP_LINES;
  }
  return chunks;
}

const BRACE_LANGUAGES = [".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".c", ".cpp", ".cs", ".rs", ".php"];

export function chunkFile(file: FetchedFile): CodeChunk[] {
  const lines = file.content.split("\n");
  if (lines.length === 0) return [];

  const isBraceLanguage = BRACE_LANGUAGES.some((ext) => file.path.endsWith(ext));
  const lineGroups = isBraceLanguage ? chunkByBraceDepth(lines) : chunkByFixedWindow(lines);

  return lineGroups
    .map((group, idx) => ({
      filePath: file.path,
      chunkIndex: idx,
      content: group.join("\n").trim(),
    }))
    .filter((chunk) => chunk.content.length > 20); // drop near-empty chunks
}

export function chunkFiles(files: FetchedFile[]): CodeChunk[] {
  return files.flatMap(chunkFile);
}
