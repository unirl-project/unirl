import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(docsRoot, "..");
const contentRoot = path.join(docsRoot, "content/docs");
const publicRoot = path.join(docsRoot, "public");
const sourceRoot = path.resolve(process.env.UNIRL_SOURCE_ROOT || repoRoot);

const retiredTerms = [
  /\btrain_vlm\b/g,
  /\bRolloutReq\b/g,
  /\bRolloutResp\b/g,
  /\bRolloutTrack\b/g,
  /\bDiffusionGRPO\b/g,
  /\bDiffusionDPPO\b/g,
  /\bARGRPO\b/g,
  /\bexamples\/vlm\b/g,
  /\bexamples\/llm\b/g,
  /\bcu129\b/g,
  /\beasyocr\b/g,
  /\brun_experiment_multinode_taiji\b/g,
  /\bunirl\/train\/stack\.py\b/g,
  /\bunirl\/types\/rollout_req\.py\b/g,
  /\bunirl\/types\/rollout_resp\.py\b/g,
  /\bunirl\/algorithms\/diffusion_grpo\.py\b/g,
  /\bunirl\/algorithms\/ar_grpo\.py\b/g,
  /\bdiffusion_grpo\.py\b/g,
  /\bar_grpo\.py\b/g,
];

const repositoryPathRoots =
  "unirl-reward-service|unirl|examples|datasets|benchmarks|assets|experimental|lint";
const linkedStaticExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".svg",
  ".webp",
  ".zip",
]);

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

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function lineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function pageCandidates(target) {
  if (path.extname(target)) {
    return [target];
  }
  return [
    `${target}.md`,
    `${target}.mdx`,
    path.join(target, "index.md"),
    path.join(target, "index.mdx"),
  ];
}

async function existingFile(candidates) {
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function resolvePageFile(target) {
  const localPage = await existingFile(pageCandidates(target));
  if (localPage) return localPage;

  const relative = path.relative(contentRoot, target);
  const [language, ...rest] = relative.split(path.sep);
  if (language !== "zh") return null;

  const englishTarget = path.join(contentRoot, "en", ...rest);
  return existingFile(pageCandidates(englishTarget));
}

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function localReference(file, url, kind) {
  const normalized = url.replace(/^<|>$/g, "");
  if (
    !normalized ||
    normalized.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalized)
  ) {
    return null;
  }

  const hashIndex = normalized.indexOf("#");
  const fragment =
    hashIndex === -1 ? "" : decodeUrlPart(normalized.slice(hashIndex + 1));
  const beforeHash = hashIndex === -1 ? normalized : normalized.slice(0, hashIndex);
  const cleanUrl = decodeUrlPart(beforeHash.split("?", 1)[0]);
  const route = cleanUrl.match(/^\/(en|zh)\/docs(?:\/(.*))?$/);
  if (route) {
    return {
      type: "page",
      target: path.join(contentRoot, route[1], route[2] || "index"),
      fragment,
    };
  }

  if (!cleanUrl) {
    return { type: "page", target: file, fragment };
  }

  if (cleanUrl.startsWith("/")) {
    const extension = path.posix.extname(cleanUrl);
    if (kind === "asset" || linkedStaticExtensions.has(extension.toLowerCase())) {
      return {
        type: "asset",
        target: path.join(publicRoot, cleanUrl.replace(/^\/+/, "")),
        fragment: "",
      };
    }
    // Next.js route handlers and non-doc application routes are outside this
    // content check.
    return null;
  }

  const extension = path.extname(cleanUrl);
  const isPage = kind === "link" && (!extension || /\.(?:md|mdx)$/i.test(extension));
  return {
    type: isPage ? "page" : "asset",
    target: path.resolve(path.dirname(file), cleanUrl),
    fragment,
  };
}

function references(text) {
  const result = [];
  const patterns = [
    {
      kind: "link",
      pattern: /(?<!!)\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
    },
    {
      kind: "asset",
      pattern: /!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
    },
    { kind: "link", pattern: /\bhref\s*=\s*["']([^"']+)["']/g },
    { kind: "asset", pattern: /\bsrc\s*=\s*["']([^"']+)["']/g },
  ];
  for (const { kind, pattern } of patterns) {
    for (const match of text.matchAll(pattern)) {
      result.push({ kind, url: match[1], index: match.index });
    }
  }
  return result;
}

function headingSlug(heading) {
  return heading
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function fragmentsIn(text) {
  const fragments = new Set();
  const duplicateCounts = new Map();

  for (const match of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) {
    fragments.add(match[1]);
  }
  for (const match of text.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const explicitId = match[1].match(/\s*\{#([^}]+)}\s*$/);
    if (explicitId) {
      fragments.add(explicitId[1]);
      continue;
    }
    const base = headingSlug(match[1]);
    if (!base) continue;
    const count = duplicateCounts.get(base) || 0;
    duplicateCounts.set(base, count + 1);
    fragments.add(count === 0 ? base : `${base}-${count}`);
  }
  return fragments;
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

function isPlaceholderPath(sourcePath) {
  return (
    /[<>{}\[\]*$]/.test(sourcePath) ||
    sourcePath.includes("...") ||
    /(^|\/)(?:xxx|yyy|foo|bar|path|name|owner|model|dataset|domain|recipe|placeholder|your[-_][^/]+)(?:\/|$)/i.test(
      sourcePath,
    )
  );
}

function mentionedSourcePaths(text) {
  const paths = new Map();
  const add = (sourcePath, index) => {
    const cleaned = sourcePath
      .split(/[?#]/, 1)[0]
      .replace(/[),.:;!?，。；：！？]+$/u, "")
      .replace(/\/+$/, "");
    if (!cleaned || isPlaceholderPath(cleaned)) return;
    const lineStart = text.lastIndexOf("\n", index) + 1;
    const lineEnd = text.indexOf("\n", index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    if (
      /(?:^|\s)(?:TODO|planned|future|proposed|implement|add)(?:\s|:)|待实现|计划|规划|新增/u.test(
        line,
      ) ||
      /\[\s\]/.test(line)
    ) {
      return;
    }
    if (!paths.has(cleaned)) paths.set(cleaned, index);
  };

  for (const match of text.matchAll(/\bpython\s+-m\s+(unirl\.[^\s`"'\\]+)/g)) {
    if (/^unirl(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(match[1])) {
      add(`${match[1].replaceAll(".", "/")}.py`, match.index);
    }
  }
  for (const match of text.matchAll(/--config-name(?:=|\s+)([^\s`"'\\]+)/g)) {
    add(`examples/${match[1].replace(/\.ya?ml$/, "")}.yaml`, match.index);
  }

  // Remove URL destinations first: visible Markdown labels remain searchable,
  // but repository names inside github.com URLs do not become false paths.
  const withoutUrls = text.replace(
    /\b(?:https?|ftp):\/\/[^\s<>"']+/gi,
    (url) => " ".repeat(url.length),
  );
  const pathPattern = new RegExp(
    `\\b(?:${repositoryPathRoots})\\/[^\\s\\x60"'|()]+`,
    "g",
  );
  for (const match of withoutUrls.matchAll(pathPattern)) {
    add(match[0], match.index);
  }
  return paths;
}

function manifestArray(manifest, key, errors) {
  if (!Array.isArray(manifest[key])) {
    errors.push(`framework documentation manifest field "${key}" must be an array`);
    return [];
  }
  return manifest[key];
}

function addInventoryPath(inventory, sourcePath, origin) {
  if (!inventory.has(sourcePath)) inventory.set(sourcePath, new Set());
  inventory.get(sourcePath).add(origin);
}

function addModulePath(inventory, module, origin, errors) {
  if (typeof module !== "string" || !/^unirl(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(module)) {
    errors.push(`${origin} has invalid Python module ${JSON.stringify(module)}`);
    return;
  }
  addInventoryPath(inventory, `${module.replaceAll(".", "/")}.py`, origin);
}

function addRecipePath(inventory, recipe, origin, errors) {
  if (
    typeof recipe !== "string" ||
    !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(recipe)
  ) {
    errors.push(`${origin} has invalid recipe ${JSON.stringify(recipe)}`);
    return;
  }
  addInventoryPath(inventory, `examples/${recipe.replace(/\.ya?ml$/, "")}.yaml`, origin);
}

function checkDuplicateManifestValues(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`framework documentation manifest duplicates ${label} "${value}"`);
    seen.add(value);
  }
}

async function consumeManifest(manifestPath, inventory, errors) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`cannot parse framework documentation manifest: ${error.message}`);
    return;
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors.push("framework documentation manifest must contain a JSON object");
    return;
  }
  if (manifest.schema_version !== 1) {
    errors.push(
      `unsupported framework documentation manifest schema ${JSON.stringify(manifest.schema_version)}`,
    );
  }

  const entrypoints = manifestArray(manifest, "entrypoints", errors);
  const algorithms = manifestArray(manifest, "algorithms", errors);
  const models = manifestArray(manifest, "models", errors);
  const recipes = manifestArray(manifest, "recipes", errors);
  const recipeNames = recipes.filter((recipe) => typeof recipe === "string");

  checkDuplicateManifestValues(
    entrypoints.map((entry) => entry?.module),
    "entrypoint",
    errors,
  );
  checkDuplicateManifestValues(
    algorithms.map((algorithm) => `${algorithm?.module}:${algorithm?.symbol}`),
    "algorithm",
    errors,
  );
  checkDuplicateManifestValues(
    models.map((model) => model?.name),
    "model",
    errors,
  );
  checkDuplicateManifestValues(recipeNames, "recipe", errors);

  for (const [index, entrypoint] of entrypoints.entries()) {
    const origin = `framework manifest entrypoints[${index}]`;
    addModulePath(inventory, entrypoint?.module, origin, errors);
    if (entrypoint?.default_recipe != null) {
      addRecipePath(inventory, entrypoint.default_recipe, `${origin}.default_recipe`, errors);
      if (!recipeNames.includes(entrypoint.default_recipe)) {
        errors.push(
          `${origin} default recipe "${entrypoint.default_recipe}" is absent from manifest recipes`,
        );
      }
    }
  }
  for (const [index, algorithm] of algorithms.entries()) {
    const origin = `framework manifest algorithms[${index}]`;
    addModulePath(inventory, algorithm?.module, origin, errors);
    if (typeof algorithm?.symbol !== "string" || !algorithm.symbol) {
      errors.push(`${origin} has invalid exported symbol ${JSON.stringify(algorithm?.symbol)}`);
    }
  }
  for (const [index, model] of models.entries()) {
    const origin = `framework manifest models[${index}]`;
    if (typeof model?.name !== "string" || !/^[A-Za-z0-9_]+$/.test(model.name)) {
      errors.push(`${origin} has invalid model name ${JSON.stringify(model?.name)}`);
      continue;
    }
    addInventoryPath(inventory, `unirl/models/${model.name}/bundle.py`, origin);
  }
  for (const [index, recipe] of recipes.entries()) {
    addRecipePath(inventory, recipe, `framework manifest recipes[${index}]`, errors);
  }
}

async function consumeDiscoveredFallback(inventory, errors) {
  console.warn(
    `Framework manifest not found under ${sourceRoot}; using source-discovered fallback inventory.`,
  );

  const unirlRoot = path.join(sourceRoot, "unirl");
  const examplesRoot = path.join(sourceRoot, "examples");
  if (!(await isDirectory(unirlRoot)) || !(await isDirectory(examplesRoot))) {
    errors.push(
      `framework source root ${sourceRoot} must contain both unirl/ and examples/`,
    );
    return;
  }
  for (const entry of await readdir(unirlRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/^train_.*\.py$/.test(entry.name)) continue;
    const relative = `unirl/${entry.name}`;
    addInventoryPath(inventory, relative, "discovered framework entrypoint");
    const source = await readFile(path.join(unirlRoot, entry.name), "utf8");
    const configName = source.match(
      /@hydra\.main\([\s\S]*?\bconfig_name\s*=\s*["']([^"']+)["']/,
    )?.[1];
    if (configName) {
      addRecipePath(inventory, configName, `default recipe in ${relative}`, errors);
    }
  }

  for (const recipePath of (await walk(examplesRoot)).filter((file) => /\.ya?ml$/.test(file))) {
    addInventoryPath(
      inventory,
      path.relative(sourceRoot, recipePath).split(path.sep).join("/"),
      "discovered framework recipe",
    );
  }

  const algorithmsInit = path.join(sourceRoot, "unirl/algorithms/__init__.py");
  if (await exists(algorithmsInit)) {
    const source = await readFile(algorithmsInit, "utf8");
    const exportsBlock =
      source.match(/_EXPORTS\s*=\s*[\[(]([\s\S]*?)[\])]\s*\n_SYMBOL_MODULES/)?.[1] || "";
    for (const match of exportsBlock.matchAll(
      /\(\s*["'][A-Za-z_][A-Za-z0-9_]*["']\s*,\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/g,
    )) {
      addInventoryPath(
        inventory,
        `unirl/algorithms/${match[1]}.py`,
        "discovered algorithm export",
      );
    }
  }

  const modelsRoot = path.join(sourceRoot, "unirl/models");
  for (const entry of await readdir(modelsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const bundle = `unirl/models/${entry.name}/bundle.py`;
    if (await exists(path.join(sourceRoot, bundle))) {
      addInventoryPath(inventory, bundle, "discovered model bundle");
    }
  }
}

async function main() {
  const files = await walk(contentRoot);
  const errors = [];
  const markdownFiles = files.filter((target) => /\.(?:md|mdx)$/.test(target));
  const fragmentCache = new Map();
  const sourceInventory = new Map();

  for (const file of markdownFiles) {
    const text = await readFile(file, "utf8");
    const display = path.relative(docsRoot, file);
    for (const pattern of retiredTerms) {
      for (const match of text.matchAll(pattern)) {
        errors.push(
          `${display}:${lineNumber(text, match.index)} uses retired term "${match[0]}"`,
        );
      }
    }

    for (const { kind, url, index } of references(text)) {
      const reference = localReference(file, url, kind);
      if (!reference) continue;
      if (reference.type === "asset") {
        if (!(await exists(reference.target))) {
          errors.push(`${display}:${lineNumber(text, index)} references missing local asset "${url}"`);
        }
        continue;
      }

      const pageFile = await resolvePageFile(reference.target);
      if (!pageFile) {
        errors.push(`${display}:${lineNumber(text, index)} links to missing page "${url}"`);
        continue;
      }
      if (reference.fragment) {
        if (!fragmentCache.has(pageFile)) {
          fragmentCache.set(pageFile, fragmentsIn(await readFile(pageFile, "utf8")));
        }
        if (!fragmentCache.get(pageFile).has(reference.fragment)) {
          errors.push(
            `${display}:${lineNumber(text, index)} links to missing fragment "#${reference.fragment}" in "${url}"`,
          );
        }
      }
    }

    for (const [sourcePath, index] of mentionedSourcePaths(text)) {
      addInventoryPath(
        sourceInventory,
        sourcePath,
        `${display}:${lineNumber(text, index)}`,
      );
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
      const target = path.resolve(path.dirname(file), entry);
      const validTarget =
        (await resolvePageFile(target)) ||
        ((await isDirectory(target)) && (await exists(path.join(target, "meta.json"))));
      if (!validTarget) {
        errors.push(`${path.relative(docsRoot, file)} navigation target "${entry}" does not exist`);
      }
    }
  }

  const manifestPath = path.join(sourceRoot, "docs/reference-manifest.json");
  if (await exists(manifestPath)) {
    await consumeManifest(manifestPath, sourceInventory, errors);
  } else {
    await consumeDiscoveredFallback(sourceInventory, errors);
  }

  for (const sourcePath of [...sourceInventory.keys()].sort()) {
    if (!(await exists(path.join(sourceRoot, sourcePath)))) {
      const origins = [...sourceInventory.get(sourcePath)].join(", ");
      errors.push(
        `framework source target "${sourcePath}" is missing under ${sourceRoot} (referenced by ${origins})`,
      );
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
