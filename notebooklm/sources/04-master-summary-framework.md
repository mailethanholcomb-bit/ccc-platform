# CCC Master Summary Framework

## Overview

The Master Summary Engine is the aggregation layer that assembles outputs from all three analysis engines (Deal Analyzer, Research Protocol, and Benchmark Analysis) into a single, cohesive deal summary. It produces the final deliverable that a CCC member uses to make their acquisition decision.

## Summary Structure

### 1. Deal Snapshot
A one-glance overview of the opportunity:
- Business name, industry, and location
- Asking price and standalone business price (excluding real estate)
- Asking multiple and standalone multiple
- Real estate value and whether it's included
- Overall deal grade with full explanation

### 2. Financial Health
Core financial metrics aggregated from the Deal Analyzer:
- Revenue and SDE for the most recent year
- Gross margin and SDE margin
- Revenue growth year-over-year
- DSCR in both scenarios
- Annual debt service
- Working capital from DSCR spread
- Screening verdict from the Benchmark engine

### 3. Market Position
Industry context from the Benchmark engine:
- Full industry benchmark comparisons
- All 11 screening traits with scores and rationale
- Summary line: "X PASS, Y DISCUSS, Z FAIL — [VERDICT]"

### 4. Business Intelligence
Qualitative insights from the Research Protocol:
- Industry overview narrative
- Competitive landscape analysis
- Digital footprint score
- Google review profile (count, rating, sentiment)
- Distress signals with severity and evidence
- Protocol verdict and scorecard total

## Flag System

### Red Flags (Risk Indicators)
Collected from all engines, sorted by severity:
- **Critical**: FAIL screening scores, DSCR < 1.25, revenue decline > 30%, SDE margin < 10%, high-severity distress signals, digital score < 20, Google rating < 3.0
- **Moderate**: DISCUSS screening scores, DSCR < 1.50, any revenue decline, SDE margin < 15%, moderate distress signals, digital score < 40, Google rating < 3.5

### Green Flags (Strength Indicators)
Positive signals that support the deal:
- PASS screening scores
- Strong DSCR (>= 1.50x)
- Growing revenue
- Healthy SDE margin (>= 20%)
- Strong Google reviews (>= 4.0 rating)
- Solid digital footprint (>= 60/100)

## Buy Box Alignment

A checklist comparing the deal against the member's personal acquisition criteria:
- Minimum annual revenue
- Minimum SDE
- DSCR floor
- Maximum asking multiple
- Target industries
- Target geographies

Each criterion shows the member's threshold, the deal's value, and whether it meets the standard.

## Sensitivity Highlights

The top 3-5 insights from the Benchmark engine's sensitivity analysis, helping the member understand how the deal performs under stress.

## Recommended Next Steps

Tailored action items based on the final verdict:

**GO Verdict:**
1. Submit Letter of Intent (LOI) with proposed terms
2. Request complete financial package (3 years of tax returns, P&L, balance sheets)
3. Schedule introductory call with seller or broker
4. Engage legal counsel for asset purchase agreement review
5. Begin Phase 2 due diligence checklist

**CONDITIONAL Verdict:**
1. Request additional documentation to address flagged concerns
2. Model alternative deal structures (if DSCR is the issue)
3. Request month-over-month revenue detail (if revenue is declining)
4. Schedule call with broker to discuss conditional items
5. Re-evaluate after additional information is received
6. Determine if seller is willing to adjust price or terms

**NO-GO Verdict:**
1. Prepare broker decline communication (email template provided)
2. Archive deal file for future reference
3. Document specific disqualification reasons for pattern tracking
4. If conditions change significantly, deal may be re-evaluated
5. Continue reviewing pipeline for qualifying deals
