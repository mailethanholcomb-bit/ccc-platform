# CCC Broker Email Generator Framework

## Overview

The Email Generator produces professional broker communication templates for deals that receive NO-GO or CONDITIONAL verdicts. It generates two email options for every decline, maintaining broker relationships while being transparent about underwriting standards.

## Two Email Options

### Option A: Clean Pass
A professional, definitive decline that:
- Thanks the broker for the opportunity
- States the decision not to move forward
- Shares the specific red flags that drove the decision (4-6 top flags by severity)
- Frames the decline as a criteria mismatch, not a judgment on the business
- Shares the buyer's acquisition criteria (minimum revenue, minimum SDE, DSCR floor)
- Asks to remain on the broker's distribution list

**Best for**: Deals with 3+ critical red flags where re-engagement is unlikely.

### Option B: Warm Open
A softer decline that keeps the door open:
- Thanks the broker for the opportunity
- States inability to proceed "as currently structured"
- Lists concerns in numbered format
- Explicitly invites adjustments to deal structure, pricing, or terms
- Offers to reconsider with additional context or updated financials
- Maintains the relationship for future deals

**Best for**: CONDITIONAL deals or NO-GO deals with fewer than 3 critical red flags.

## Selection Logic

The engine automatically recommends the most appropriate option:

| Verdict | Critical Red Flags | Suggested Option |
|---------|-------------------|-----------------|
| NO-GO | 3+ critical flags | Option A (Clean Pass) |
| NO-GO | < 3 critical flags | Option B (Warm Open) |
| CONDITIONAL | Any | Option B (Warm Open) |

Both options are always generated — the member can override the suggestion.

## Red Flag Integration

The engine selects 4-6 of the most important red flags (sorted by severity: critical first) and formats them as bullet points (Option A) or numbered list items (Option B). Each flag includes its data point for specificity.

## Professional Signature

The email uses the member's custom signature block if available, or constructs one from their profile (name, title, company, phone).

## Design Philosophy

1. **Always maintain the broker relationship**: Even in a hard decline, the email is respectful and professional. Brokers are repeat-deal sources.
2. **Be transparent about criteria**: Sharing specific reasons builds credibility and helps brokers send better-fit deals in the future.
3. **Leave doors open when appropriate**: CONDITIONAL deals and soft declines use Option B to invite counter-offers or additional information.
4. **Save time**: Pre-generated emails eliminate the friction of writing decline communications, ensuring members respond promptly instead of ghosting brokers.
