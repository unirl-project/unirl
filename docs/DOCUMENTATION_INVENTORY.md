# UniRL documentation inventory

Snapshot date: 2026-09-14

This is a maintainer planning document, not a user guide. It inventories the
documentation published from two repositories:

- Framework source and near-code documentation:
  [`Tencent-Hunyuan/UniRL@main`](https://github.com/Tencent-Hunyuan/UniRL)
- Fumadocs site and GitHub Pages deployment:
  [`unirl-project/unirl@main`](https://github.com/unirl-project/unirl)

Paths below are relative to the named repository root. The **verification
source** column identifies the code or configuration that owns the documented
fact. Updating a document means checking that source; it does not mean copying
the source verbatim into the site.

## Priority and disposition

- **P0**: known user-facing error, broken route, or obsolete command; fix first.
- **P1**: materially behind the framework; update after P0.
- **P2**: targeted verification or maintenance cleanup.
- **P3**: currently low risk; keep and review periodically.
- **Generated**: do not edit directly; fix its source README or generator.

Every update task should end with one disposition: **keep**, **update**,
**merge**, **replace**, or **remove**.

## Documentation-site pages

Each row covers the matching English and Chinese page unless noted otherwise.
The recorded date is the last substantive page commit in the docs-site
repository.

| ID | Pages under `docs/content/docs/{en,zh}/` | Purpose | Last update | Verification source in framework `main` | Priority | Proposed disposition | Suggested owner |
|---|---|---|---|---|---|---|---|
| SITE-00 | `index.mdx` | Site landing page and capability summary | 2026-06-08 | `README.md`, `examples/README.md` | P0 | update | Documentation maintainer |
| SITE-01 | `getting-started/installation.mdx` | Python, engine and optional dependency installation | 2026-06-08 | `pyproject.toml`, `INSTALL.md` | P0 | update | Packaging maintainer |
| SITE-02 | `getting-started/first-run.mdx` | First compose check and launch command | 2026-06-08 | `unirl/train_*.py`, `examples/run_experiment_*.sh` | P0 | update | Trainer maintainer |
| SITE-03 | `getting-started/transfer-queue-installation.mdx` | Optional TransferQueue and Mooncake setup | 2026-06-08 | `unirl/distributed/tensor/backend/transfer_queue/`, `examples/mooncake_master.sh`, `examples/**/*tq*.yaml` | P1 | update | Distributed maintainer |
| SITE-04 | `architecture/concepts.mdx` | Core terminology and object model | 2026-06-04 | `unirl/types/`, `unirl/types/README.md`, `unirl/models/types/` | P1 | update | Architecture maintainer |
| SITE-05 | `architecture/overview.mdx` | End-to-end runtime architecture | 2026-06-04 | `unirl/README.md`, `unirl/trainer/`, `unirl/rollout/`, `unirl/train/` | P1 | replace | Architecture maintainer |
| SITE-06 | `architecture/trainer-v2.mdx` | Trainer and train-stack behavior | 2026-06-08 | `unirl/trainer/`, `unirl/trainer/README.md`, `unirl/train/readme.md` | P0 | update | Trainer maintainer |
| SITE-07 | `architecture/roadmap.mdx` | Public development roadmap | 2026-06-08 | Implemented packages and accepted project roadmap | P1 | update | Project lead |
| SITE-08 | `configuration/hydra.mdx` | Hydra composition and `_target_` contracts | 2026-06-08 | `unirl/config/`, `unirl/config/README.md`, `examples/**/*.yaml` | P1 | update | Configuration maintainer |
| SITE-09 | `configuration/experiments.mdx` | Recipe selection and inventory | 2026-06-08 | `examples/README.md`, `examples/**/*.yaml`, `unirl/train_*.py` | P0 | replace | Recipe maintainers |
| SITE-10 | `guides/data-and-models.mdx` | Runtime data and model integration | 2026-06-08 | `unirl/data/`, `unirl/models/`, `unirl/models/README.md` | P1 | update | Data/model maintainers |
| SITE-11 | `guides/data-preparation.mdx` | Offline dataset preparation | 2026-06-08 | `datasets/`, `datasets/README.md`, `pyproject.toml` `dataset-prep` extra | P1 | update | Data maintainer |
| SITE-12 | `guides/rewards.mdx` | Local, managed and remote rewards | 2026-06-08 | `unirl/reward/`, `unirl/reward/README.md`, `unirl-reward-service/` | P1 | update | Reward maintainer |
| SITE-13 | `guides/evaluation.mdx` | Evaluation and benchmark paths | 2026-06-08 | `benchmarks/`, `benchmarks/core/registry.py`, `unirl/reward/local/` | P1 | update | Evaluation maintainer |
| SITE-14 | `guides/extending.mdx` | Adding models, algorithms, rewards and engines | 2026-06-08 | Public interfaces in the corresponding `unirl/` packages | P1 | update | Architecture maintainer |
| SITE-15 | `guides/multinode.mdx` | Multi-node launch and transport | 2026-06-08 | `examples/run_experiment_multinode.sh`, `unirl/distributed/` | P1 | update | Distributed maintainer |
| SITE-16 | `guides/geneval-mmcv-setup.mdx` | Legacy GenEval/OpenMMLab environment | 2026-06-04 | `unirl-reward-service/envs/geneval.txt`, scorer configuration | P1 | replace | Reward maintainer |
| SITE-17 | `agents/index.mdx` | Machine-readable documentation entry points | 2026-06-08 | `docs/app/llms*`, `docs/app/md/`, `docs/app/api/search.json/` | P2 | verify | Docs-site maintainer |
| SITE-18 | `agents/task-recipes.mdx` | Agent navigation/task patterns | 2026-06-08 | Current site information architecture and framework entry points | P1 | update | Docs-site maintainer |
| SITE-19 | `community.mdx` | Community channels | 2026-06-15 | Current public links and QR asset | P3 | keep | Community maintainer |
| SITE-20 | `others/github-issues-workflow.mdx` | Issue-writing workflow | 2026-06-04 | Framework issue forms and contribution policy | P2 | merge into contributing section | Project maintainer |
| SITE-21 | `getting-started/readme-docs-site.mdx` | Embedded docs-site README | 2026-06-08 | `docs/README.md`, `docs/scripts/sync-readme-reference.mjs` | Generated | regenerate | Docs-site maintainer |

## Generated package-reference pages

These pages should be generated from framework `main`. They must not become a
second hand-maintained copy of the package README.

| Output page slug | Verification/source README | Current action |
|---|---|---|
| `getting-started/readme-project` | `README.md` | regenerate |
| `getting-started/readme-docs-site` | docs-site `docs/README.md` | regenerate |
| `configuration/readme-config-package` | `unirl/config/README.md` | regenerate |
| `architecture/readme-code-architecture` | `unirl/README.md` | regenerate |
| `architecture/readme-rollout` | `unirl/rollout/README.md` | regenerate |
| `architecture/readme-train-stack` | `unirl/train/readme.md` | regenerate |
| `architecture/readme-algorithms` | `unirl/algorithms/README.md` | regenerate |
| `architecture/readme-sde` | `unirl/sde/README.md` | regenerate |
| `architecture/readme-weight-sync` | `unirl/distributed/weight_sync/README.md` | regenerate |
| `guides/readme-reward-package` | `unirl/reward/README.md` | regenerate |
| `guides/readme-models` | `unirl/models/README.md` | regenerate |
| `guides/readme-reward-service` | `unirl-reward-service/README.md` | regenerate |

## Framework entry and architecture documents

Dates in this section come from the framework repository history.

| ID | Framework path | Purpose | Last update | Verification source | Priority | Proposed disposition | Suggested owner |
|---|---|---|---|---|---|---|---|
| CORE-00 | `README.md` | Public project entry, capability and support tables | 2026-09-08 | `pyproject.toml`, `unirl/train_*.py`, public exports, model bundles and recipes | P0 | update | Framework docs maintainer |
| CORE-01 | `INSTALL.md` | Supported installation procedure | 2026-09-08 | `pyproject.toml`, engine version pins | P1 | update | Packaging maintainer |
| CORE-02 | `examples/README.md` | Domains, entry points and recipe naming | 2026-08-31 | `examples/**/*.yaml`, `unirl/train_*.py`, launch scripts | P0 | update | Recipe maintainers |
| CORE-03 | `unirl/README.md` | Runtime and package architecture | 2026-09-08 | Current `unirl/` package boundaries and trainer flow | P1 | update | Architecture maintainer |
| CORE-04 | `unirl/algorithms/README.md` | Algorithm contracts and matrix | 2026-09-07 | `unirl/algorithms/__init__.py`, algorithm classes and recipe targets | P0 | update | Algorithm maintainers |
| CORE-05 | `unirl/config/README.md` | Recipe instantiation and validation | 2026-08-18 | `unirl/config/`, call sites in `unirl/train_*.py` and trainers | P1 | update | Configuration maintainer |
| CORE-06 | `unirl/models/README.md` | Model bundle/stage/pipeline contract | 2026-09-09 | `unirl/models/*/bundle.py`, model recipes | P1 | update | Model maintainers |
| CORE-07 | `unirl/types/README.md` | Shared runtime types | 2026-08-13 | `unirl/types/` | P2 | verify | Types maintainer |
| CORE-08 | `unirl/trainer/README.md` | Domain trainers, async and checkpointing | 2026-08-14 | `unirl/trainer/`, `unirl/train_*.py` | P1 | update | Trainer maintainers |
| CORE-09 | `unirl/train/readme.md` | Backend and train-stack contracts | 2026-09-09 | `unirl/train/` | P1 | update | Train-stack maintainers |
| CORE-10 | `unirl/train/sft/README.md` | SFT track contract | 2026-08-18 | `unirl/train/sft/`, `unirl/trainer/sft.py`, SFT recipes | P1 | update | SFT maintainer |
| CORE-11 | `unirl/rollout/README.md` | Rollout modes and data contract | 2026-08-18 | `unirl/rollout/`, rollout recipes | P1 | update | Rollout maintainers |
| CORE-12 | `unirl/rollout/engine/README.md` | Rollout-engine inventory | 2026-09-08 | `unirl/rollout/engine/*/engine.py` | P1 | update | Rollout maintainers |
| CORE-13 | `unirl/rollout/env/README.md` | Agent environment and tool contract | 2026-08-08 | `unirl/rollout/env/`, agentic trainer and recipes | P1 | update | Agentic maintainer |
| CORE-14 | `unirl/rollout/engine/fastvideo/README.md` | FastVideo integration | 2026-08-19 | FastVideo engine, patches and WAN recipes | P1 | update | FastVideo maintainer |
| CORE-15 | `unirl/rollout/engine/sglang_diffusion/_patches/README.md` | SGLang diffusion patch set | 2026-08-13 | Patch files and pinned SGLang version | P2 | verify | SGLang maintainer |
| CORE-16 | `unirl/rollout/engine/vllm_omni/patches/README.md` | vLLM-Omni patch set | 2026-09-09 | Patch files and pinned vLLM-Omni version | P2 | verify | vLLM-Omni maintainer |
| CORE-17 | `unirl/reward/README.md` | Reward backends and scorer integration | 2026-08-17 | `unirl/reward/local/registry.py`, reward implementations and recipes | P1 | update | Reward maintainers |
| CORE-18 | `unirl/distributed/README.md` | Ray placement and data transport | 2026-07-27 | `unirl/distributed/`, trainer placement call sites | P1 | update | Distributed maintainers |
| CORE-19 | `unirl/distributed/weight_sync/README.md` | Trainer-to-rollout weight synchronization | 2026-09-08 | `unirl/distributed/weight_sync/`, recipe `sync` blocks | P1 | update | Weight-sync maintainers |
| CORE-20 | `unirl/sde/README.md` | Diffusion SDE and solver behavior | 2026-08-19 | `unirl/sde/`, diffusion rollout/replay call sites | P2 | verify | Diffusion maintainer |
| CORE-21 | `unirl/utils/README.md` | Shared utility contracts | 2026-08-18 | `unirl/utils/` and call sites | P2 | verify | Core maintainer |

## Algorithm and experimental guides

| ID | Framework path | Last update | Verification source | Priority | Proposed disposition |
|---|---|---|---|---|---|
| ALG-00 | `CPPO/README.md` | 2026-08-18 | `unirl/algorithms/cppo.py`, CPPO recipes and paper configs | P1 | update |
| ALG-01 | `DRPO/README.md` | 2026-08-18 | `unirl/algorithms/drpo.py`, DRPO recipes and paper configs | P1 | update |
| ALG-02 | `FlowDPPO/README.md` | 2026-07-27 | `unirl/algorithms/flowdppo.py`, FlowDPPO recipes and paper configs | P1 | update |
| ALG-03 | `experimental/README.md` | 2026-07-31 | `experimental/` boundary checks | P2 | verify |
| ALG-04 | `experimental/refl/README.md` | 2026-08-02 | `experimental/refl/` implementation and recipes | P2 | verify |

## Dataset documentation

For dataset-specific pages, the converter, manifest schema and checked-in data
inside the same directory are the primary verification source.

| ID | Framework path | Last update | Priority | Proposed disposition |
|---|---|---|---|---|
| DATA-00 | `datasets/README.md` | 2026-08-19 | P1 | update index |
| DATA-01 | `datasets/arxivqa_mc/README.md` | 2026-08-31 | P2 | verify |
| DATA-02 | `datasets/asearcher/README.md` | 2026-08-18 | P2 | verify |
| DATA-03 | `datasets/daily_omni_av/README.md` | 2026-08-05 | P2 | verify |
| DATA-04 | `datasets/dapo_math/README.md` | 2026-08-18 | P2 | verify |
| DATA-05 | `datasets/dcase2025_audio_qa/README.md` | 2026-08-05 | P2 | verify |
| DATA-06 | `datasets/droid100/README.md` | 2026-08-19 | P2 | verify |
| DATA-07 | `datasets/geo3k_mc/README.md` | 2026-08-18 | P2 | verify |
| DATA-08 | `datasets/image_edit/README.md` | 2026-06-11 | P1 | update |
| DATA-09 | `datasets/ocr/README.md` | 2026-09-08 | P2 | verify |
| DATA-10 | `datasets/searchgen/README.md` | 2026-08-18 | P2 | verify |
| DATA-11 | `datasets/sft_manifests/README.md` | 2026-08-18 | P1 | update |
| DATA-12 | `datasets/ucf101/README.md` | 2026-08-31 | P2 | verify |
| DATA-13 | `datasets/video_r1_260k/README.md` | 2026-08-10 | P2 | verify |

## Benchmark documentation

The benchmark registry and implementation under the same benchmark directory
are the verification source for each row.

| ID | Framework path | Last update | Priority | Proposed disposition |
|---|---|---|---|---|
| BENCH-00 | `benchmarks/README.md` | 2026-07-16 | P1 | update index |
| BENCH-01 | `benchmarks/image/dpg_bench/README.md` | 2026-07-16 | P2 | verify |
| BENCH-02 | `benchmarks/image/geneval/README.md` | 2026-07-16 | P1 | update compatibility warning |
| BENCH-03 | `benchmarks/image/geneval2/README.md` | 2026-07-26 | P2 | verify |
| BENCH-04 | `benchmarks/image/preference/README.md` | 2026-07-16 | P2 | verify |
| BENCH-05 | `benchmarks/speed_benchmarks/README.md` | 2026-07-16 | P2 | verify |
| BENCH-06 | `benchmarks/speed_benchmarks/verl_omni/README.md` | 2026-07-16 | P2 | preserve historical environment; verify labels |
| BENCH-07 | `benchmarks/text/aime/README.md` | 2026-07-16 | P2 | verify |
| BENCH-08 | `benchmarks/text/gpqa/README.md` | 2026-07-16 | P2 | verify |
| BENCH-09 | `benchmarks/text/math500/README.md` | 2026-07-16 | P2 | verify |
| BENCH-10 | `benchmarks/video/vbench/README.md` | 2026-07-16 | P2 | verify |

## Reward-service documentation

| ID | Framework path | Purpose | Last update | Verification source | Priority | Proposed disposition |
|---|---|---|---|---|---|---|
| REWARD-00 | `unirl-reward-service/README.md` | User-facing service setup and scorer list | 2026-09-08 | scorer registry, example configs and environment files | P1 | update |
| REWARD-01 | `unirl-reward-service/docs/ARCHITECTURE.md` | Service architecture | 2026-09-08 | service implementation | P2 | verify |
| REWARD-02 | `unirl-reward-service/docs/DEVELOPMENT_LOG.md` | Internal development history | 2026-06-09 | repository history | P3 | keep; label maintainer-only |
| REWARD-03 | `unirl-reward-service/docs/RESUME_PROMPT.md` | Internal handoff material | 2026-06-09 | current maintenance workflow | P3 | keep or remove from user navigation |
| REWARD-04 | `unirl-reward-service/reward_service/scorers/_videoalign/README.md` | Vendored scorer notes | 2026-06-09 | vendored implementation/version | P3 | keep vendored |

## Inventory maintenance

Update this inventory in the same change when:

- a public `train_*.py` entry point or its default recipe changes;
- a recipe domain, model bundle, algorithm export, rollout engine or reward
  backend is added or removed;
- `pyproject.toml` changes Python, engine pins or optional extras;
- a documentation page is added, renamed, merged or removed;
- a generated README-reference source is changed.

When assigning work, use the row ID in the issue title, for example:
`[SITE-01] Refresh installation guide from pyproject.toml`.
