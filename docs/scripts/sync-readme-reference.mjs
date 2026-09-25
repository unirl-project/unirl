import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(docsRoot, "..");
const sourceRoot = path.resolve(process.env.UNIRL_SOURCE_ROOT || repoRoot);
const contentRoot = path.join(docsRoot, "content/docs");

const generatedLanguage = "en";
const cleanupLanguages = ["en", "zh"];
const frameworkBlobBase = (
  process.env.UNIRL_SOURCE_URL || "https://github.com/Tencent-Hunyuan/UniRL/blob/main"
).replace(/\/+$/, "");
const docsBlobBase = (
  process.env.UNIRL_DOCS_SOURCE_URL || "https://github.com/unirl-project/unirl/blob/main"
).replace(/\/+$/, "");
const frameworkRawBase = (
  process.env.UNIRL_SOURCE_RAW_URL ||
  "https://raw.githubusercontent.com/Tencent-Hunyuan/UniRL/main"
).replace(/\/+$/, "");
const docsRawBase = (
  process.env.UNIRL_DOCS_RAW_URL ||
  "https://raw.githubusercontent.com/unirl-project/unirl/main"
).replace(/\/+$/, "");
const strict = process.env.UNIRL_SYNC_STRICT
  ? !["0", "false", "no"].includes(process.env.UNIRL_SYNC_STRICT.toLowerCase())
  : Boolean(process.env.CI);

const legacyDirs = [
  ...cleanupLanguages.map((language) => path.join(contentRoot, language, "reference/readmes")),
  ...cleanupLanguages.flatMap((language) =>
    ["architecture", "configuration", "guides", "getting-started"].map((section) =>
      path.join(contentRoot, language, section, "readme-reference"),
    ),
  ),
];

const readmes = [
  {
    source: "README.md",
    section: "getting-started",
    slug: "project",
    title: "Project README",
    description: "Project quick start, documentation entry points, checks, and citation.",
  },
  {
    source: "docs/README.md",
    siteLocal: true,
    section: "getting-started",
    slug: "docs-site",
    title: "Docs Site README",
    description: "Fumadocs site commands, structure, and maintenance notes.",
  },
  {
    source: "unirl/config/README.md",
    section: "configuration",
    slug: "config-package",
    title: "Config Package",
    description: "Config registration, instantiation, validation, and extension contracts.",
  },
  {
    source: "unirl/README.md",
    section: "architecture",
    slug: "code-architecture",
    title: "Code Architecture",
    description: "Runtime loop, module map, data flow, and package boundaries.",
  },
  {
    source: "unirl/rollout/README.md",
    section: "architecture",
    slug: "rollout",
    title: "Rollout",
    description: "Rollout modes, engines, request planning, and response contracts.",
  },
  {
    source: "unirl/train/readme.md",
    section: "architecture",
    slug: "train-stack",
    title: "Train Stack",
    description:
      "v2 single-stage train stack: FSDPBackend, TrainStack, structural injection, EMA shadow, and the train-step contract.",
  },
  {
    source: "unirl/algorithms/README.md",
    section: "architecture",
    slug: "algorithms",
    title: "Algorithms",
    description: "Train-side loss algorithm contracts and the reward-to-gradient path.",
  },
  {
    source: "unirl/sde/README.md",
    section: "architecture",
    slug: "sde",
    title: "SDE",
    description: "SDE strategy rules, schedules, kernels, and log-probability paths.",
  },
  {
    source: "unirl/distributed/weight_sync/README.md",
    section: "architecture",
    slug: "weight-sync",
    title: "Weight Sync",
    description: "Trainer-to-rollout weight synchronization backends and contracts.",
  },
  {
    source: "unirl/reward/README.md",
    section: "guides",
    slug: "reward-package",
    title: "Reward Package",
    description: "Reward service, backends, scorers, and the reward extension workflow.",
  },
  {
    source: "unirl/models/README.md",
    section: "guides",
    slug: "models",
    title: "Models",
    description: "Model bundle, stage, condition, and per-model package contracts.",
  },
  {
    source: "unirl-reward-service/README.md",
    section: "guides",
    slug: "reward-service",
    title: "Reward Service",
    description: "Standalone remote reward service: scorers, HTTP API, and deployment.",
  },
];

function stripTopLevelHeading(markdown) {
  return markdown.replace(/^# .*(?:\r?\n){1,2}/, "");
}

function transformOutsideCode(markdown, transform) {
  const protectedCode = [];
  const protect = (value) => {
    const token = `\u0000UNIRL_CODE_${protectedCode.length}\u0000`;
    protectedCode.push(value);
    return token;
  };

  let protectedMarkdown = markdown.replace(
    /^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^ {0,3}\1[ \t]*(?=\r?$)/gm,
    protect,
  );
  protectedMarkdown = protectedMarkdown.replace(/(`+)([\s\S]*?)\1/g, protect);

  const transformed = transform(protectedMarkdown);
  return transformed.replace(
    /\u0000UNIRL_CODE_(\d+)\u0000/g,
    (_match, index) => protectedCode[Number(index)],
  );
}

function rewriteRelativeMarkdownLinks(entry, markdown) {
  const sourceDir = path.posix.dirname(entry.source);
  const sourceBase = entry.siteLocal ? docsBlobBase : frameworkBlobBase;

  return markdown
    .replace(
      /\[(!\[[^\]]*]\([^)]+\))]\((?!#|[a-z][a-z0-9+.-]*:|\/)([^)\s]+)\)/gi,
      (_match, image, target) => {
        const [targetPath, anchor = ""] = target.split("#");
        const resolvedPath = path.posix.normalize(path.posix.join(sourceDir, targetPath));
        const resolvedAnchor = anchor ? `#${anchor}` : "";
        return `[${image}](${sourceBase}/${resolvedPath}${resolvedAnchor})`;
      },
    )
    .replace(
      /(?<!!)\[([^\]]+)\]\((?!#|[a-z][a-z0-9+.-]*:|\/)([^)\s]+)\)/gi,
      (_match, label, target) => {
        const [targetPath, anchor = ""] = target.split("#");
        const resolvedPath = path.posix.normalize(path.posix.join(sourceDir, targetPath));
        const resolvedAnchor = anchor ? `#${anchor}` : "";
        return `[${label}](${sourceBase}/${resolvedPath}${resolvedAnchor})`;
      },
    );
}

function rewriteMdxIncompatibleMarkup(entry, markdown) {
  const sourceDir = path.posix.dirname(entry.source);
  const rawBase = entry.siteLocal ? docsRawBase : frameworkRawBase;
  return markdown
    // HTML comments are valid in Markdown/GitHub, but MDX treats `<!--` as JSX.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<img\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi, (_match, attributes) => {
      const rewritten = attributes.replace(
        /\bsrc=(["'])([^"']+)\1/i,
        (srcMatch, quote, target) => {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(target)) {
            return srcMatch;
          }
          const resolvedPath = path.posix.normalize(path.posix.join(sourceDir, target));
          return `src=${quote}${rawBase}/${resolvedPath}${quote}`;
        },
      );
      return `<img${rewritten.replace(/\s*\/?\s*$/, "")} />`;
    })
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/<(https?:\/\/[^>\s]+)>/g, (_match, target) => `[${target}](${target})`);
}

function renderPage(entry, body) {
  const rewritten = transformOutsideCode(body, (markdown) =>
    rewriteMdxIncompatibleMarkup(entry, rewriteRelativeMarkdownLinks(entry, markdown)),
  );
  const content = stripTopLevelHeading(rewritten).trim();
  const sourceBase = entry.siteLocal ? docsBlobBase : frameworkBlobBase;
  const sourceUrl = `${sourceBase}/${entry.source}`;

  return `---
title: ${JSON.stringify(entry.title)}
description: ${JSON.stringify(entry.description)}
---

{/* Generated from ${entry.source} by docs/scripts/sync-readme-reference.mjs. Edit the source README, not this file. */}

${content}

> Source: [\`${entry.source}\`](${sourceUrl}) — edit the README next to the code, then run \`npm run sync:readmes\` from \`docs/\`.
`;
}

async function removeGeneratedPages(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.startsWith("readme-") && entry.name.endsWith(".mdx"))
      .map((entry) => unlink(path.join(dir, entry.name))),
  );
}

async function main() {
  const sources = [];
  const missing = [];
  for (const entry of readmes) {
    try {
      sources.push({
        entry,
        body: await readFile(
          path.join(entry.siteLocal ? repoRoot : sourceRoot, entry.source),
          "utf8",
        ),
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        missing.push(entry.source);
        continue;
      }
      throw error;
    }
  }

  if (strict && missing.length > 0) {
    throw new Error(
      `Strict README sync requires every configured source (framework root: ${sourceRoot}). Missing:\n  - ${missing.join("\n  - ")}`,
    );
  }

  for (const dir of legacyDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  const sections = new Set(readmes.map((entry) => entry.section));
  for (const language of cleanupLanguages) {
    for (const section of sections) {
      await removeGeneratedPages(path.join(contentRoot, language, section));
    }
  }

  for (const { entry, body } of sources) {
    const page = renderPage(entry, body);
    const dir = path.join(contentRoot, generatedLanguage, entry.section);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `readme-${entry.slug}.mdx`), page);
  }

  console.log(
    `Generated ${sources.length}/${readmes.length} English README reference pages from ${sourceRoot}`,
  );
  if (missing.length > 0) {
    console.warn(
      `Loose mode skipped ${missing.length} README source(s):\n  - ${missing.join("\n  - ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
