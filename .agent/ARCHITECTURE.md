# Antigravity Kit Architecture

> **Version 6.0** - Expanded AI Agent, Skill, and Workflow System

---

## 📋 Overview

Operating protocol (how to select workflows/agents/skills/tools and how to verify/document work) is defined in `OPERATING_MODEL.md`.

Antigravity Kit is a modular system consisting of:
- **30 Specialist Agents** - Role-based AI personas
- **55 Local Skills** + **77 Global Skills** - Domain-specific knowledge modules (local is source of truth)
- **37 Workflows** - Slash command procedures (local and global are synchronized)

---

## 🏗️ Directory Structure

```
.agent/
├── ARCHITECTURE.md          # This file
├── agents/                  # 30 Specialist Agents (local)
├── skills/                  # 55 Skills (local)
├── workflows/               # 37 Slash Commands (local)
├── rules/                   # Global Rules
└── .shared/                 # Shared Resources
```

Global installs (available to all projects; local pushes to global):
```
%USERPROFILE%\.codex\
├── agents\
├── skills\
└── workflows\
```

---

## 🤖 Agents (30)

Specialist AI personas for different domains.

| Agent | Focus | Skills Used |
|-------|-------|-------------|
| `orchestrator` | Multi-agent coordination | parallel-agents, behavioral-modes |
| `project-planner` | Discovery, task planning | brainstorming, plan-writing, architecture |
| `frontend-specialist` | Web UI/UX | frontend-design, react-patterns, tailwind-patterns |
| `backend-specialist` | API, business logic | api-patterns, nodejs-best-practices, database-design |
| `database-architect` | Schema, SQL | database-design, prisma-expert |
| `mobile-developer` | iOS, Android, RN | mobile-design |
| `game-developer` | Game logic, mechanics | game-development |
| `devops-engineer` | CI/CD, Docker | deployment-procedures, docker-expert |
| `security-auditor` | Security compliance | vulnerability-scanner, red-team-tactics |
| `penetration-tester` | Offensive security | red-team-tactics |
| `test-engineer` | Testing strategies | testing-patterns, tdd-workflow, webapp-testing |
| `debugger` | Root cause analysis | systematic-debugging |
| `performance-optimizer` | Speed, Web Vitals | performance-profiling |
| `seo-specialist` | Ranking, visibility | seo-fundamentals, geo-fundamentals |
| `documentation-writer` | Manuals, docs | documentation-templates |
| `explorer-agent` | Codebase analysis | - |
| `ai-solution-architect` | End-to-end AI solution design | architecture, app-builder, ai-product |
| `ai-product-strategist` | AI product strategy | ai-product, prompt-engineer |
| `automation-architect` | Workflow automation | workflow-automation, n8n-workflow-patterns |
| `analytics-lead` | Analytics systems | analytics-tracking |
| `conversion-optimizer` | CRO + forms | form-cro |
| `growth-seo-lead` | SEO + programmatic | seo-fundamentals, programmatic-seo |
| `voice-agent-designer` | Voice agent systems | voice-agents |
| `repo-automation-specialist` | Repo automation | github-workflow-automation |
| `sre-specialist` | Reliability + observability | observability-stack |
| `compliance-officer` | Privacy + governance | compliance-governance |
| `data-engineer` | Data pipelines + warehousing | data-pipelines |
| `content-strategist` | Editorial + blog systems | blog-content-strategy |
| `social-media-manager` | Social growth + campaigns | social-media-strategy |
| `seo-researcher` | Keywords + competitors + links | keyword-research, competitor-analysis, backlink-strategy |

---

## 🧠 Skills (Local + Global)

Domain-specific knowledge modules. Skills are loaded on-demand based on task context.
Local skills live in `.agent/skills`, global skills live in `%USERPROFILE%\.codex\skills`.
See `skills-catalog.txt` for the full list.

### Frontend & UI
| Skill | Description |
|-------|-------------|
| `react-patterns` | React hooks, state, performance |
| `nextjs-best-practices` | App Router, Server Components |
| `tailwind-patterns` | Tailwind CSS v4 utilities |
| `frontend-design` | UI/UX patterns, design systems |
| `ui-ux-pro-max` | 50 styles, 21 palettes, 50 fonts |
| `design-md` | Generate DESIGN.md from Stitch |
| `react-components` | Generate React components from Stitch |

### Backend & API
| Skill | Description |
|-------|-------------|
| `api-patterns` | REST, GraphQL, tRPC |
| `nestjs-expert` | NestJS modules, DI, decorators |
| `nodejs-best-practices` | Node.js async, modules |
| `python-patterns` | Python standards, FastAPI |
| `ai-product` | LLM product patterns |
| `ai-wrapper-product` | AI wrapper product strategy |
| `openapi-governance` | OpenAPI specs and contracts |

### Database
| Skill | Description |
|-------|-------------|
| `database-design` | Schema design, optimization |
| `prisma-expert` | Prisma ORM, migrations |

### TypeScript/JavaScript
| Skill | Description |
|-------|-------------|
| `typescript-expert` | Type-level programming, performance |

### Cloud & Infrastructure
| Skill | Description |
|-------|-------------|
| `docker-expert` | Containerization, Compose |
| `deployment-procedures` | CI/CD, deploy workflows |
| `server-management` | Infrastructure management |

### Testing & Quality
| Skill | Description |
|-------|-------------|
| `testing-patterns` | Jest, Vitest, strategies |
| `webapp-testing` | E2E, Playwright |
| `tdd-workflow` | Test-driven development |
| `code-review-checklist` | Code review standards |
| `lint-and-validate` | Linting, validation |

### Security
| Skill | Description |
|-------|-------------|
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics` | Offensive security |
| `schema-markup` | Structured data correctness |
| `compliance-governance` | Privacy + compliance |
| `accessibility-auditor` | WCAG audits |

### Architecture & Planning
| Skill | Description |
|-------|-------------|
| `app-builder` | Full-stack app scaffolding |
| `architecture` | System design patterns |
| `plan-writing` | Task planning, breakdown |
| `brainstorming` | Socratic questioning |
| `agent-tool-builder` | Tool schema design |
| `autonomous-agent-patterns` | Agent design patterns |
| `agent-memory-systems` | Memory architecture |
| `terraform-iac` | Infrastructure-as-Code |
| `observability-stack` | Logs/metrics/traces/SLOs |
| `data-pipelines` | ETL/ELT pipeline patterns |

### Mobile
| Skill | Description |
|-------|-------------|
| `mobile-design` | Mobile UI/UX patterns |

### Game Development
| Skill | Description |
|-------|-------------|
| `game-development` | Game logic, mechanics |

### SEO & Growth
| Skill | Description |
|-------|-------------|
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization |
| `programmatic-seo` | Scaled SEO page systems |
| `analytics-tracking` | Analytics event strategy |
| `form-cro` | Conversion optimization for forms |
| `keyword-research` | SEO keyword discovery |
| `competitor-analysis` | Competitive gap analysis |
| `backlink-strategy` | Link building and audits |
| `ga4-analytics` | GA4 measurement and audits |
| `social-media-strategy` | Social channel growth |
| `blog-content-strategy` | Editorial systems |

### Shell/CLI
| Skill | Description |
|-------|-------------|
| `bash-linux` | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell |

### Other
| Skill | Description |
|-------|-------------|
| `clean-code` | Coding standards (Global) |
| `behavioral-modes` | Agent personas |
| `parallel-agents` | Multi-agent patterns |
| `mcp-builder` | Model Context Protocol |
| `documentation-templates` | Doc formats |
| `i18n-localization` | Internationalization |
| `performance-profiling` | Web Vitals, optimization |
| `systematic-debugging` | Troubleshooting |
| `notebooklm` | NotebookLM research + citations |
| `github-workflow-automation` | GitHub workflow automation |
| `workflow-automation` | Durable workflow orchestration |
| `n8n-workflow-patterns` | n8n architecture patterns |
| `n8n-node-configuration` | n8n node config guidance |
| `n8n-expression-syntax` | n8n expression helpers |
| `n8n-code-javascript` | n8n Code node (JS) |
| `n8n-code-python` | n8n Code node (Python) |
| `n8n-validation-expert` | n8n validation errors |
| `n8n-mcp-tools-expert` | n8n MCP tooling |
| `voice-agents` | Voice agent architecture |
| `prompt-engineer` | Prompt design patterns |

### Additional Installed Skills (2026-02-02)

`web-artifacts-builder`, `project-development`, `brand-guidelines`,
`3d-web-experience`, `browser-automation`, `marketing-psychology`,
`scroll-experience`, `web-design-guidelines`, `web-performance-optimization`,
`dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`,
`receiving-code-review`, `requesting-code-review`, `subagent-driven-development`,
`test-driven-development`, `using-git-worktrees`, `using-superpowers`,
`verification-before-completion`, `writing-plans`, `writing-skills`

---

## 🔄 Workflows (37)

Slash command procedures. Invoke with `/command`.

Note: `/installall` now runs MCP preflight scripts in `./scripts`.

| Command | Description |
|---------|-------------|
| `/brainstorm` | Socratic discovery |
| `/create` | Create new features |
| `/debug` | Debug issues |
| `/deploy` | Deploy application |
| `/enhance` | Improve existing code |
| `/orchestrate` | Multi-agent coordination |
| `/plan` | Task breakdown |
| `/preview` | Preview changes |
| `/status` | Check project status |
| `/test` | Run tests |
| `/ui-ux-pro-max` | Design with 50 styles |
| `/discovery` | Client discovery workflow |
| `/ai-solution-architecture` | AI solution blueprint |
| `/automation-blueprint` | Workflow automation plan |
| `/analytics-implementation` | Analytics instrumentation |
| `/conversion-optimization` | CRO analysis + plan |
| `/seo-growth-plan` | SEO + growth strategy |
| `/voice-agent-design` | Voice agent spec |
| `/repo-automation` | Repo automation checklist |
| `/installskills` | Install global skills |
| `/installworkflows` | Install global workflows |
| `/installagents` | Install global agents |
| `/syncskills` | Sync local/global skills |
| `/syncagents` | Sync local/global agents |
| `/syncworkflows` | Sync local/global workflows |
| `/sync-docs` | Continuous documentation loop |
| `/security-gate` | Pre-deploy security gate |
| `/feedback-loop` | Analytics + feedback to roadmap |
| `/audit-and-fix` | Periodic lint + security loop |
| `/keyword-research` | Keyword discovery workflow |
| `/competitor-analysis` | Competitive gap analysis |
| `/ga4-audit` | GA4 audit workflow |
| `/backlink-plan` | Backlink audit and plan |
| `/social-content-plan` | Social content planning |
| `/blog-strategy` | Editorial strategy |
| `/ui-artifact-loop` | Multi-model UI loop (Codex leads; Gemini/Stitch design; Opus review) |
| `/stitch-design-to-react` | Stitch → DESIGN.md + React components |
| `/sequential-plan` | Structured multi-step planning |

---

## 🎯 Skill Loading Protocol

```
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Skill Structure

```
skill-name/
├── SKILL.md           # (Required) Metadata & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

### Enhanced Skills (with scripts/references)

| Skill | Files | Coverage |
|-------|-------|----------|
| `typescript-expert` | 5 | Utility types, tsconfig, cheatsheet |
| `ui-ux-pro-max` | 27 | 50 styles, 21 palettes, 50 fonts |
| `app-builder` | 20 | Full-stack scaffolding |

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Total Agents** | 30 |
| **Local Skills** | 55 |
| **Global Skills** | 77 |
| **Total Workflows** | 37 |
| **Coverage** | Web, mobile, automation, AI products, analytics, SEO, growth |

---

## 🔗 Quick Reference

| Need | Agent | Skills |
|------|-------|--------|
| Web App | `frontend-specialist` | react-patterns, nextjs-best-practices |
| API | `backend-specialist` | api-patterns, nodejs-best-practices |
| Mobile | `mobile-developer` | mobile-design |
| Database | `database-architect` | database-design, prisma-expert |
| Security | `security-auditor` | vulnerability-scanner |
| Testing | `test-engineer` | testing-patterns, webapp-testing |
| Debug | `debugger` | systematic-debugging |
| Plan | `project-planner` | brainstorming, plan-writing |

## MCP Configuration
Use `%USERPROFILE%\.codex\config.toml` for MCP server connections.

## Bootstrap Repo (Global Source of Truth)
Canonical bootstrap repo (Option 2):
- Path (example): `%USERPROFILE%\SanLuis Solutions projects\sanluis-bootstrap`
- Override path with env var: CODEX_BOOTSTRAP_REPO

`/installall` will auto-sync from the bootstrap repo via:
`%USERPROFILE%\.codex\scripts\sync-bootstrap.ps1`

