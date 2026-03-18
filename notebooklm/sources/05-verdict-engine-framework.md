# CCC Verdict Engine Framework

## Overview

The Verdict Engine is the final decision-making layer of the CCC Platform. It applies a strict, rules-based evaluation in priority order to produce a GO, NO-GO, or CONDITIONAL recommendation. The first matching rule wins — there is no averaging or blending of scores.

## Three-Phase Decision Cascade

### Phase 1: Hard NO-GO Checks (Any Single Condition Is Disqualifying)

These are absolute deal killers. If ANY of these conditions are true, the deal is immediately classified as NO-GO:

1. **DSCR below 1.25x in ALL scenarios** — The business cannot cover basic debt service under any financing structure
2. **Revenue declining more than 30% year-over-year** — Catastrophic revenue loss indicates fundamental business problems
3. **Deal grade is F** — Automatic disqualification based on the Deal Analyzer's composite grade
4. **4 or more FAIL screening scores** — Too many fundamental weaknesses to overcome
5. **SDE below $100,000** — Insufficient earnings to support acquisition economics

### Phase 2: CONDITIONAL Checks (Proceed with Caution)

If no hard NO-GO triggers fire, the engine checks for CONDITIONAL indicators. Any of these moves the deal to CONDITIONAL status:

1. **Primary DSCR between 1.25x and member's floor** — Coverage exists but is below the member's comfort level; creative structuring may help
2. **Deal grade is D** — Marginal quality that needs further investigation
3. **2-3 FAIL screening scores** — Significant but potentially addressable weaknesses
4. **1-2 critical red flags** — Serious concerns that may be correctable with negotiation or operational improvements

### Phase 3: GO (Default)

If no disqualifiers or conditional flags are triggered, the deal earns a GO recommendation. The engine documents the positive factors:

1. DSCR meets or exceeds the member's personal floor
2. Deal grade is C or better (meets quality threshold)
3. 0-1 FAIL screening scores (within acceptable range)
4. No hard disqualifiers identified across all engines

## Verdict Output

Each verdict includes:
- **Verdict**: go, no_go, or conditional
- **Reasoning**: A formatted explanation with the verdict header and numbered list of triggered rules
- **Triggered Rules**: Array of specific conditions that determined the outcome

### Verdict Headers
- **GO**: "This deal meets all underwriting criteria and is recommended for pursuit."
- **NO-GO**: "This deal fails one or more hard disqualification criteria and is not recommended."
- **CONDITIONAL**: "This deal has factors that require further review or negotiation before a final decision."

## Design Philosophy

The Verdict Engine embodies Brett's core acquisition philosophy:

1. **Protect the downside first**: Hard NO-GO rules exist to prevent catastrophic acquisitions. No amount of upside potential can override a deal that fails basic underwriting.

2. **Leave room for negotiation**: CONDITIONAL verdicts recognize that many deals can become good deals with the right structure, price adjustment, or additional information.

3. **Default to action**: If a deal passes all negative screens, the default is GO. The system is designed for active buyers who want to acquire businesses, not for finding reasons to say no.

4. **Transparency over black boxes**: Every verdict includes the specific rules that triggered it, so the member understands exactly why and can make an informed final decision.
