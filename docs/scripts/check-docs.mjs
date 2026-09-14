import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(docsRoot, "..");
const contentRoot = path.join(docsRoot, "content/docs");
const sourceRoot = path.resolve(process.env.UNIRL_SOURCE_ROOT || repoRoot);

const forbiddenTokens = [
  "train_vlm",
  "examples/vlm",
  "examples/llm",
  "cu129",
  "easyocr",
  "run_experiment_multinode_taiji",
];

const requiredSourcePaths = [
  "unirl/train_diffusion.py",
  "unirl/train_ar.py",
  "unirl/train_async_ar.py",
  "unirl/train_async_diffusion.py",
  "unirl/train_sft.py",
  "unirl/train_pe.py",
  "unirl/train_unified_model.py",
  "unirl/train_agentic.py",
  "examples/run_experiment_single_node.sh",
  "examples/run_experiment_multinode.sh",
  "examples/diffusion/sd3/sd3_trainside.yaml",
  "examples/ar/qwen_vl_grpo_geo3k_mc_4x8.yaml",
  "examples/ar/qwen3_grpo_4b_base_dapo_sglang_async.yaml",
  "examples/diffusion/bagel/bagel_vllmomni_async.yaml",
  "examples/sft/qwen3_sft.yaml",
  "examples/pe/pe_trainside_pickscore.yaml",
  "examples/unified_model/hi3_vllmomni.yaml",
  "examples/deep_research/deep_research_search_judge.yaml",
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return files.flat();
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function pageCandidates(target) {
  if (path.extname(target)) {
    return [target];
  }
  return [
    target,
    `${target}.md`,
    `${target}.mdx`,
    path.join(target, "index.md"),
    path.join(target, "index.mdx"),
  ];
}

async function pageExists(target) {
  if ((await Promise.all(pageCandidates(target).map(exists))).some(Boolean)) {
    return true;
  }
  const relative = path.relative(contentRoot, target);
  const [language, ...rest] = relative.split(path.sep);
  if (language !== "zh") {
    return false;
  }
  const englishTarget = path.join(contentRoot, "en", ...rest);
  return (await Promise.all(pageCandidates(englishTarget).map(exists))).some(Boolean);
}

function internalTarget(file, url) {
  if (
    !url ||
    url.startsWith("#") ||
    url.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(url)
  ) {
    return null;
  }
  const cleanUrl = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  const route = cleanUrl.match(/^\/(en|zh)\/docs(?:\/(.*))?$/);
  if (route) {
    return path.join(contentRoot, route[1], route[2] || "index");
  }
  if (cleanUrl.startsWith("/")) {
    return null;
  }
  return path.resolve(path.dirname(file), cleanUrl);
}

function links(text) {
  const result = [];
  for (const pattern of [
    /(?<!!)\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
    /\bhref\s*=\s*["']([^"']+)["']/g,
  ]) {
    for (const match of text.matchAll(pattern)) {
      result.push(match[1]);
    }
  }
  return result;
}

function lineNumber(text, needle) {
  return text.slice(0, text.indexOf(needle)).split("\n").length;
}

function navigationEntries(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(navigationEntries);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(navigationEntries);
  }
  return [];
}

function mentionedSourcePaths(text) {
  const paths = new Set();
  for (const match of text.matchAll(/\bpython\s+-m\s+(unirl\.[A-Za-z0-9_.]+)/g)) {
    paths.add(`${match[1].replaceAll(".", "/")}.py`);
  }
  for (const match of text.matchAll(/\bexamples\/[A-Za-z0-9_./-]+\.(?:ya?ml|sh)\b/g)) {
    paths.add(match[0]);
  }
  for (const match of text.matchAll(/--config-name(?:=|\s+)([A-Za-z0-9_./-]+)/g)) {
    paths.add(`examples/${match[1].replace(/\.ya?ml$/, "")}.yaml`);
  }
  return paths;
}

async function main() {
  const files = await walk(contentRoot);
  const errors = [];
  const sourcePaths = new Set(requiredSourcePaths);

  for (const file of files.filter((target) => /\.(?:md|mdx)$/.test(target))) {
    const text = await readFile(file, "utf8");
    const display = path.relative(docsRoot, file);
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        errors.push(`${display}:${lineNumber(text, token)} uses retired token "${token}"`);
      }
    }
    for (const url of links(text)) {
      const target = internalTarget(file, url);
      if (target && !(await pageExists(target))) {
        errors.push(`${display} links to missing internal target "${url}"`);
      }
    }
    for (const sourcePath of mentionedSourcePaths(text)) {
      sourcePaths.add(sourcePath);
    }
  }

  for (const file of files.filter((target) => path.basename(target) === "meta.json")) {
    const metadata = JSON.parse(await readFile(file, "utf8"));
    for (const entry of navigationEntries(metadata.pages)) {
      if (
        !entry ||
        entry === "..." ||
        entry.startsWith("---") ||
        entry.startsWith("!") ||
        /^[a-z][a-z0-9+.-]*:/i.test(entry)
      ) {
        continue;
      }
      if (!(await pageExists(path.resolve(path.dirname(file), entry)))) {
        errors.push(`${path.relative(docsRoot, file)} navigation target "${entry}" does not exist`);
      }
    }
  }

  for (const sourcePath of [...sourcePaths].sort()) {
    if (!(await exists(path.join(sourceRoot, sourcePath)))) {
      errors.push(`framework source target "${sourcePath}" is missing under ${sourceRoot}`);
    }
  }

  if (errors.length > 0) {
    console.error(`Documentation checks failed (${errors.length}):\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Documentation checks passed (${files.length} content files; framework source: ${sourceRoot})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
