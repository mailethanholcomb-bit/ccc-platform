# CCC Deal Analyzer Framework

## Overview

The Deal Analyzer is the core financial analysis engine of the CashFlow Catalyst Club (CCC) Platform. It computes multiples, margins, DSCR (Debt Service Coverage Ratio), 5-year projections, IRR (Internal Rate of Return), deal grading, and negotiation strategy for business acquisitions.

## Key Financial Metrics

### Multiples
- **Asking Multiple**: Asking Price / SDE (Seller's Discretionary Earnings)
- **Standalone Multiple**: (Asking Price - Real Estate Value) / SDE
- These multiples tell you how many years of earnings you're paying for the business.

### Margins
- **Gross Margin**: (Revenue - COGS) / Revenue — measures production efficiency
- **SDE Margin**: SDE / Revenue — measures how much of revenue the owner actually takes home
- Both are tracked across 3 years to identify trends.

### Year-over-Year Growth
- Revenue and SDE growth rates are computed between consecutive years.
- Declining revenue is a major red flag; growing revenue is a green flag.

## DSCR (Debt Service Coverage Ratio)

DSCR is the most critical metric in acquisition underwriting. It measures whether the business generates enough cash flow to cover loan payments.

**Formula**: DSCR = SDE / Annual Debt Service

### Two Standard Scenarios
- **Scenario 1 (Conservative)**: 10% down payment, 10.5% interest rate, 10-year term
- **Scenario 2 (Aggressive)**: 5% down payment, 10.5% interest rate, 10-year term

### DSCR Thresholds
- **1.80x or higher**: Grade A — excellent coverage
- **1.50x or higher**: Grade B — strong coverage
- **1.25x or higher**: Grade C — adequate (bank minimum)
- **1.00x or higher**: Grade D — marginal, breakeven
- **Below 1.00x**: Grade F — cash flow negative, deal killer

## Working Capital from DSCR Spread

The platform calculates how much additional borrowing capacity exists between the bank's minimum DSCR (1.25x) and the member's personal DSCR floor. This spread, when converted to a present value annuity (8% rate, 5-year term), represents available working capital for post-acquisition improvements.

## Deal Grading System

Deals receive a letter grade (A through F) based on the worst-performing metric across four dimensions:

| Grade | DSCR | Multiple | SDE Margin | Cash Flow |
|-------|------|----------|------------|-----------|
| A | >= 1.80x | <= 3.5x | >= 12% | >= $300K |
| B | >= 1.50x | <= 4.5x | >= 10% | >= $200K |
| C | >= 1.25x | <= 5.5x | >= 8% | >= $150K |
| D | >= 1.00x | <= 6.5x | >= 5% | >= $100K |
| F | Below D thresholds | | | |

The overall grade equals the lowest individual metric grade. The system identifies which metric(s) are the limiting factor and explains what improvement is needed to reach the next grade.

## 5-Year Projections

The engine projects revenue, SDE, and free cash flow over 5 years using:
- **Default growth rate**: 5% annually
- **Debt service**: Fixed (same annual payment throughout)
- **Free Cash Flow**: SDE minus Annual Debt Service
- **Cumulative Cash Flow**: Running total of free cash flow

## Exit Value and IRR

- **Exit Value**: Year 5 projected SDE multiplied by a 3.5x exit multiple
- **IRR (Internal Rate of Return)**: Solved using Newton's method with bisection fallback
  - Cash flows: negative down payment at Year 0, free cash flow Years 1-4, free cash flow plus net sale proceeds at Year 5
  - Net proceeds = Exit Value minus remaining loan balance

## Strategy Ladder (4-Tier Negotiation Framework)

The Strategy Ladder is a negotiation playbook that structures offers at four price levels:

### Tier 1: Anchor (Aggressive) — 70% of asking
- 5% down, 20% seller financing, 15% earnout
- Purpose: Open low to create negotiation room
- Emphasize risk factors and required improvements
- Performance-linked earnout aligns incentives

### Tier 2: Target — 85% of asking
- 10% down, 15% seller financing, 10% earnout
- Primary target reflecting fair market value with buyer risk premium
- Most probable close point

### Tier 3: Ceiling — 95% of asking
- 10% down, 10% seller financing, 5% earnout
- Maximum price with minimal creative structuring
- Only acceptable with robust transition support, non-compete, favorable lease

### Tier 4: Walk-Away — 100% of asking
- 10% down, standard SBA terms, no seller financing or earnout
- If deal cannot close at or below this tier, walk away
- DSCR and cash flow must still meet minimum thresholds

Each tier calculates its own DSCR based on the blended debt service (SBA loan at 10.5% over 10 years + seller note at 5% over 5 years).
