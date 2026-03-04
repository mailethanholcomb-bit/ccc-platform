// ---------------------------------------------------------------------------
// Broker Email Generator – produces Option A (Clean Pass) and Option B
// (Warm Open) decline / conditional emails with professional templates.
// ---------------------------------------------------------------------------

export interface EmailInput {
  deal: {
    businessName: string | null;
    brokerName: string | null;
  };
  profile: {
    fullName: string;
    companyName: string | null;
    title: string | null;
    phone: string | null;
    signatureBlock: string | null;
    minAnnualRevenue: number;
    minSde: number;
    dscrFloor: number;
  };
  redFlags: Array<{ flag: string; severity: string; dataPoint: string }>;
  verdict: 'no_go' | 'conditional';
}

export interface GeneratedEmail {
  emailType: 'option_a' | 'option_b';
  subject: string;
  body: string;
  suggestedOption: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fb(value: string | null, placeholder: string): string {
  return value && value.trim() !== '' ? value : placeholder;
}

function formatCurrencyWhole(value: number): string {
  return '$' + Math.round(value).toLocaleString('en-US');
}

/**
 * Select and format the top red flags for inclusion in an email body.
 * Returns 4-6 flags sorted by severity (critical first).
 */
function selectTopFlags(
  flags: Array<{ flag: string; severity: string; dataPoint: string }>,
  max: number = 6,
  min: number = 4,
): Array<{ flag: string; severity: string; dataPoint: string }> {
  const severityOrder: Record<string, number> = { critical: 0, high: 0, moderate: 1, medium: 1, low: 2 };

  const sorted = [...flags].sort(
    (a, b) =>
      (severityOrder[a.severity.toLowerCase()] ?? 9) -
      (severityOrder[b.severity.toLowerCase()] ?? 9),
  );

  // Take between min and max, preferring to include at least `min` flags
  const count = Math.max(min, Math.min(max, sorted.length));
  return sorted.slice(0, count);
}

/**
 * Format a red flag into a readable sentence with its data point.
 */
function formatFlagLine(flag: { flag: string; severity: string; dataPoint: string }): string {
  const sentence = flag.flag.endsWith('.') ? flag.flag : `${flag.flag}.`;
  if (flag.dataPoint && flag.dataPoint.trim() !== '') {
    return `${sentence} (${flag.dataPoint})`;
  }
  return sentence;
}

function buildSignatureBlock(profile: EmailInput['profile']): string {
  // Use the member's custom signature if provided
  if (profile.signatureBlock && profile.signatureBlock.trim() !== '') {
    return profile.signatureBlock;
  }

  // Build a default signature
  const lines: string[] = [];
  lines.push(profile.fullName);
  if (profile.title) lines.push(profile.title);
  if (profile.companyName) lines.push(profile.companyName);
  if (profile.phone) lines.push(profile.phone);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Option A – Clean Pass
// ---------------------------------------------------------------------------

function generateOptionA(input: EmailInput): GeneratedEmail {
  const businessName = fb(input.deal.businessName, '[Business Name]');
  const brokerName = fb(input.deal.brokerName, '[Broker/Advisor Name]');
  const signature = buildSignatureBlock(input.profile);
  const topFlags = selectTopFlags(input.redFlags);

  const flagBullets = topFlags
    .map((f) => `  - ${formatFlagLine(f)}`)
    .join('\n');

  const body = `${brokerName},

Thank you for sharing the opportunity to review ${businessName}. We appreciate you thinking of us and taking the time to present this deal.

After completing our underwriting analysis, we have decided not to move forward with ${businessName} at this time.

In the spirit of transparency, we wanted to share the key factors that informed our decision:

${flagBullets}

This is not a reflection on the business itself or on the quality of the listing. Every buyer has a specific set of criteria, and this particular opportunity did not align with our current underwriting standards.

We remain active buyers and are always looking for opportunities that fit our acquisition criteria:

  - Minimum Annual Revenue: ${formatCurrencyWhole(input.profile.minAnnualRevenue)}
  - Minimum SDE: ${formatCurrencyWhole(input.profile.minSde)}
  - DSCR Floor: ${input.profile.dscrFloor.toFixed(2)}x

Please keep us on your distribution list for future opportunities. We value our relationship and look forward to finding the right fit.

Best regards,

${signature}`;

  return {
    emailType: 'option_a',
    subject: `Re: ${businessName} - Our Assessment and Next Steps`,
    body,
    suggestedOption: false, // set by caller
  };
}

// ---------------------------------------------------------------------------
// Option B – Warm Open
// ---------------------------------------------------------------------------

function generateOptionB(input: EmailInput): GeneratedEmail {
  const businessName = fb(input.deal.businessName, '[Business Name]');
  const brokerName = fb(input.deal.brokerName, '[Broker/Advisor Name]');
  const signature = buildSignatureBlock(input.profile);
  const topFlags = selectTopFlags(input.redFlags);

  const flagList = topFlags
    .map((f, i) => `  ${i + 1}. ${formatFlagLine(f)}`)
    .join('\n');

  const body = `${brokerName},

Thank you for the opportunity to review ${businessName}. We wanted to make sure we got back to you promptly after completing our review.

Based on our analysis, we are not in a position to move forward with the deal as currently structured. We identified the following concerns during our underwriting process:

${flagList}

As it stands today, ${businessName} does not meet our underwriting standards for the reasons outlined above.

That said, we are open to feedback and would welcome any adjustments to the deal structure, pricing, or terms that might address these concerns. If there is additional context or updated financials that could change the picture, we would be happy to take another look.

If this particular deal is not the right fit, please keep us in mind for future opportunities. We are actively acquiring and always appreciate working with quality advisors.

Best regards,

${signature}`;

  return {
    emailType: 'option_b',
    subject: `Re: ${businessName} - Feedback on Our Review`,
    body,
    suggestedOption: false, // set by caller
  };
}

// ---------------------------------------------------------------------------
// Selection logic & main export
// ---------------------------------------------------------------------------

/**
 * Determine which email option to suggest:
 * - NO-GO with 3+ critical red flags  -> Option A (clean pass)
 * - NO-GO with < 3 critical red flags -> Option B (warm open)
 * - CONDITIONAL                        -> Option B (warm open)
 */
function determineSuggestedOption(input: EmailInput): 'option_a' | 'option_b' {
  if (input.verdict === 'no_go') {
    const criticalCount = input.redFlags.filter(
      (f) => f.severity.toLowerCase() === 'critical' || f.severity.toLowerCase() === 'high',
    ).length;
    return criticalCount >= 3 ? 'option_a' : 'option_b';
  }
  // CONDITIONAL always suggests Option B
  return 'option_b';
}

export function generateEmails(
  input: EmailInput,
): { optionA: GeneratedEmail; optionB: GeneratedEmail } {
  const suggested = determineSuggestedOption(input);

  const optionA = generateOptionA(input);
  const optionB = generateOptionB(input);

  optionA.suggestedOption = suggested === 'option_a';
  optionB.suggestedOption = suggested === 'option_b';

  return { optionA, optionB };
}
