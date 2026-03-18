# CCC Content Engine — NotebookLM Setup Guide

## Notebook Name
**CCC Content Engine**

## Step 1: Create the Notebook
1. Go to [notebooklm.google.com](https://notebooklm.google.com)
2. Click **+ New Notebook**
3. Name it **"CCC Content Engine"**

## Step 2: Add Sources
Upload the following 7 source documents from `notebooklm/sources/` in this order:

| # | File | Content |
|---|------|---------|
| 1 | `00-ccc-platform-overview.md` | Complete platform overview and how all engines connect |
| 2 | `01-deal-analyzer-framework.md` | Financial analysis: multiples, DSCR, grades, strategy ladder |
| 3 | `02-research-protocol-framework.md` | 4-phase AI-powered due diligence protocol |
| 4 | `03-benchmark-analysis-framework.md` | 11-trait screening, benchmarks, sensitivity analysis |
| 5 | `04-master-summary-framework.md` | Aggregation layer: flags, buy box, next steps |
| 6 | `05-verdict-engine-framework.md` | GO/NO-GO/CONDITIONAL decision cascade |
| 7 | `06-email-generator-framework.md` | Broker email templates and selection logic |

## Step 3: Generate Audio Overview
1. In the notebook, click the **Audio Overview** button (or "Generate" in the Audio Overview panel)
2. NotebookLM will create a podcast-style audio discussion covering all six frameworks
3. The audio will cover key concepts like DSCR, the Strategy Ladder, the 3-phase verdict cascade, and how the engines interconnect

## Step 4: Generate Slide Deck
1. Use the notebook's **Generate** feature to create a presentation
2. Suggested prompt: "Create a slide deck that explains the CCC Platform's six core frameworks, how they work together, and the key concepts a new member needs to understand"
3. Alternative: Use the slide deck outline in `notebooklm/slide-deck-outline.md` as a starting point

## Tips
- Pin the `00-ccc-platform-overview.md` source as the primary reference — it connects all six engines
- Use NotebookLM's chat to ask follow-up questions about any framework
- The audio overview works best when all 7 sources are loaded before generating
