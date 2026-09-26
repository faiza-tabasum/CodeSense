import fetch from "node-fetch";
import { FetchedFile } from "../types";

const GITHUB_API = "https://api.github.com";

// File extensions we bother chunking/embedding for the MVP.
// TODO: this is a coarse allowlist — fine for a demo, revisit for real repos.
const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rb", ".php", ".c",
  ".cpp", ".cs", ".rs", ".md",
];

// Directories we never want to ingest.
const IGNORED_DIRS = [
  "node_modules", ".git", "dist", "build", "vendor", ".next", "coverage",
];

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { "User-Agent": "codesense-mvp" };
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error(
      "Couldn't parse that as a GitHub repo URL. Expected something like https://github.com/owner/repo"
    );
  }
  return { owner: match[1], repo: match[2] };
}

interface TreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `GitHub API error fetching repo info (${res.status}). Is the repo public and the URL correct?`
    );
  }
  const data = (await res.json()) as { default_branch: string };
  return data.default_branch;
}

function isIgnored(path: string): boolean {
  return IGNORED_DIRS.some((dir) => path.split("/").includes(dir));
}

function hasCodeExtension(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

// Keep the MVP fast and cheap: cap how many files we actually fetch content for.
const MAX_FILES = 40;
const MAX_FILE_SIZE_BYTES = 60_000;

export async function fetchRepoFiles(
  owner: string,
  repo: string
): Promise<FetchedFile[]> {
  const branch = await getDefaultBranch(owner, repo);

  const treeRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders() }
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub API error fetching file tree (${treeRes.status})`);
  }
  const treeData = (await treeRes.json()) as { tree: TreeItem[] };

  const candidates = treeData.tree
    .filter((item) => item.type === "blob")
    .filter((item) => !isIgnored(item.path))
    .filter((item) => hasCodeExtension(item.path))
    .filter((item) => (item.size ?? 0) <= MAX_FILE_SIZE_BYTES)
    .slice(0, MAX_FILES);

  const files: FetchedFile[] = [];

  // Sequential on purpose — keeps us comfortably inside GitHub's rate limits
  // for the MVP. Parallelize with a concurrency limit if this becomes the bottleneck.
  for (const item of candidates) {
    const blobRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`,
      { headers: authHeaders() }
    );
    if (!blobRes.ok) continue;
    const blobData = (await blobRes.json()) as { content?: string; encoding?: string };
    if (!blobData.content || blobData.encoding !== "base64") continue;
    const content = Buffer.from(blobData.content, "base64").toString("utf-8");
    files.push({ path: item.path, content });
  }

  return files;
}
