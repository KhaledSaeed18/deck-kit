# Contributing to deck-kit

Contributions to the reusable kit are welcome: bug fixes, accessibility improvements,
documentation, tests, and improvements to the authoring workflows. You do not need a coding
agent to contribute. Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- Search existing [issues](https://github.com/KhaledSaeed18/deck-kit/issues) and
  [pull requests](https://github.com/KhaledSaeed18/deck-kit/pulls) before opening a new one.
- Use the issue forms for bugs and feature requests. For documentation problems or usage
  questions, open a blank issue with the relevant file, command, and context.
- Discuss substantial features or architecture changes in an issue before implementing them.
  Small fixes and documentation improvements can go straight to a pull request.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md). Report conduct concerns
  privately using [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

This repository is a template. To create your own talk, use **Use this template** and follow
the [README](README.md#start-a-new-talk). Keep personal talk content in your copy; upstream
contributions should improve the kit for other speakers.

## Set up locally

Install Node.js **22.12 or later** and pnpm. Fork the repository, clone your fork, then:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite and `/presenter.html` alongside it. For browser tests, install
the browsers once:

```sh
pnpm exec playwright install chromium webkit
```

Use pnpm and keep `pnpm-lock.yaml` in sync with intentional dependency changes. Do not commit
generated builds, PDFs, screenshots, test reports, or `node_modules/`.

## Project rules

Read [AGENTS.md](AGENTS.md) and [docs/authoring.md](docs/authoring.md). The same rules apply
whether you write the change yourself or use an agent:

- Keep the layers separate: `src/engine/` contains behavior without visual literals,
  `src/slides/` contains content and semantic markup, and `src/theme/` contains visual values
  as tokens. Kit-level engine fixes are welcome; making a talk must not require engine edits.
- Preserve offline operation. No runtime network requests, CDNs, remote fonts, or remote
  images. Keep images local, fonts in Fontsource packages, and icons in the Lucide whitelist.
- Use strict TypeScript and vanilla DOM. No `any`, UI framework, or presentation library.
- Do not edit `examples/`. The finished talks are also test fixtures. Do not remove fonts or
  icons they use.
- Edit canonical agent guidance in `AGENTS.md` and `.agents/skills/`. Preserve the relative
  symlinks at `CLAUDE.md` and `.claude/skills`.
- Follow the authoring reference for slide copy, accessibility, notes, fragments, and SVG
  diagrams. On-screen copy uses no emoji, em dashes, or exclamation marks; icons use Lucide.
  Diagrams are hand-authored inline SVG with `dgm-*` classes, a title, and no paint attributes.

In a talk copy, `docs/brief.md` is the content source of truth and `docs/decisions.md` records
approved changes, taking precedence over the brief. Do not change facts, numbers, or slide
content without the speaker's approval. If the brief is absent, the copy still has the starter
deck. The Brief, Research and plan, Content, Verify, and Design review stops apply to making
a talk; they are not prerequisites for a kit bug fix or documentation pull request.

## Check your change

Run the checks that apply and include their results in your pull request:

| Change | Validation |
| --- | --- |
| Code, configuration, or authoring workflow | `pnpm check` |
| Engine behavior, including navigation, sync, presenter, or print | `pnpm check` and `pnpm test:engine` |
| Slides, theme, or deck manifest | `pnpm check` and `pnpm test:deck` |
| Build tooling or changes affecting both engine and deck | `pnpm check` and `pnpm test:e2e` |
| Documentation or community templates only | Check accuracy, local links, and template syntax |

Add a focused regression test for behavior fixes where practical. For visual changes, inspect
the audience and presenter views and include screenshots. If exports are affected, also run
the relevant `pnpm pdf`, `pnpm notes:pdf`, or `pnpm notes:md` command and inspect its output.
The browser suites block outside requests to verify offline behavior.

Report failed or skipped checks with the reason and relevant output. Do not describe a check
as passing if it was not run. `pnpm format` writes changes across the repository, so review
its diff and avoid unrelated formatting.

## Submit a pull request

1. Create a focused branch from `main` in your fork.
2. Keep the change small and related to one problem. Update documentation when behavior changes.
3. Fill in the pull request template: explain the problem, resulting behavior, linked issue,
   and validation. Use `Closes #123` only when the change resolves that issue.
4. Respond to review feedback. A maintainer will review scope, correctness, accessibility,
   offline behavior, and compatibility before merging. Review and release times vary.

Agent-assisted contributions follow the same review and testing expectations. You are
responsible for understanding the submitted change and checking generated claims and code.
Never include credentials, private speaker notes, or personal information in reports or diffs.

By contributing, you agree that your contributions are licensed under the repository's
[MIT license](LICENSE). Only submit material you have the right to contribute.
