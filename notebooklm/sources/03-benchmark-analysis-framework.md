# CCC Benchmark Analysis Framework

## Overview

The Benchmark Analysis Engine performs deal screening, industry benchmark comparison, DSCR scenario modeling, and sensitivity analysis. It answers the question: "How does this deal compare to industry standards and the member's personal buy box?"

## 1. Deal Screening Scorecard (11 Traits)

Every deal is scored across 11 traits. Each trait receives one of three scores:
- **PASS**: Meets or exceeds the threshold
- **DISCUSS**: Borderline — needs further investigation
- **FAIL**: Below acceptable standards

### The 11 Screening Traits

**1. DSCR**
- PASS: DSCR >= member's personal floor
- DISCUSS: DSCR >= 1.25 but below member floor
- FAIL: DSCR < 1.25

**2. Revenue Trend**
- PASS: Revenue grew year-over-year
- DISCUSS: Revenue essentially flat (within -2%)
- FAIL: Revenue declined more than 2%

**3. Gross Margin**
- PASS: At or above industry average
- DISCUSS: Between 75% and 100% of industry average
- FAIL: Below 75% of industry average

**4. Employee Count**
- PASS: Meets member's minimum employee count
- DISCUSS: At least 2 employees but below preferred minimum
- FAIL: Fewer than 2 employees

**5. Customer Concentration**
- PASS: Top client <= 15% of revenue
- DISCUSS: Top client 15-30% of revenue
- FAIL: Top client > 30% of revenue

**6. Years in Business**
- PASS: Meets member's minimum years
- DISCUSS: At least 3 years but below preferred minimum
- FAIL: Less than 3 years

**7. Owner Dependency**
- PASS: Owner works <= 35 hrs/wk with management bench
- DISCUSS: Moderate hours or partial management coverage
- FAIL: Owner works > 50 hrs/wk with no management bench

**8. Industry Outlook**
- PASS: Industry growth rate > 3%
- DISCUSS: Industry growth rate 0-3%
- FAIL: Industry declining (negative growth)

**9. Recurring Revenue**
- PASS: >= 25% recurring revenue
- DISCUSS: 10-25% recurring revenue
- FAIL: < 10% recurring revenue

**10. Real Estate**
- PASS: Real estate included OR lease >= 5 years remaining
- DISCUSS: Lease 2-5 years remaining
- FAIL: Lease < 2 years with no renewal options

**11. Deal Structure**
- PASS: DSCR meets floor AND multiple within range
- DISCUSS: Creative financing needed OR multiple slightly above max
- FAIL: No pricing scenario produces acceptable DSCR

### Screening Verdict
- **GO**: 0-1 FAIL scores and 0-3 DISCUSS scores
- **NO-GO**: 4+ FAIL scores
- **CONDITIONAL**: Everything in between

## 2. Industry Benchmark Comparison

Eight metrics are compared against industry averages:

| Metric | Comparison Method |
|--------|-------------------|
| Gross Margin | Higher = better |
| Net Margin | Higher = better |
| SDE Margin | Higher = better |
| Revenue per Employee | Higher = better |
| Multiple | Lower = better (inverse) |
| Growth Rate | Higher = better |
| Customer Concentration | Lower = better (inverse) |
| Recurring Revenue | Higher = better |

Each metric is rated: **Above**, **Within** (±5% of average), or **Below** industry benchmarks.

## 3. DSCR 6-Scenario Modeling

Six scenarios model different price points and down payments to find the sweet spot:

| Scenario | Price | Down Payment |
|----------|-------|-------------|
| 1 | Asking Price | 10% |
| 2 | Asking Price | 5% |
| 3 | 10% Discount | 10% |
| 4 | 15% Discount | 10% |
| 5 | 20% Discount | 10% |
| 6 | 25% Discount | 10% |

All scenarios use 10.5% interest rate and 10-year amortization. Each scenario shows whether the resulting DSCR meets the member's personal floor.

## 4. Sensitivity Analysis

A matrix analysis that models how the deal performs under different combinations of revenue growth and margin changes.

### Revenue Growth Scenarios
-10%, -5%, 0%, +5%, +10%, +15%

### Margin Scenarios
- Current Margin (as-is)
- Industry Average
- Improved (Industry Average + 5 percentage points)
- Pessimistic (Current - 5 percentage points)

### 5 Key Insights Generated
1. **Breakeven Analysis**: Minimum revenue growth needed to maintain DSCR >= 1.25 at current margins
2. **Margin Gap Analysis**: Impact of closing the gap to industry-average margins on SDE
3. **Downside Resilience**: Deal performance in the worst-case scenario (margin -5pp, revenue -5%)
4. **Upside Potential**: Deal performance with improved margins and 10% revenue growth
5. **Status Quo Cash Flow**: Free cash flow at current performance with no growth
