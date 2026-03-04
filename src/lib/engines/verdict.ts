// ---------------------------------------------------------------------------
// Master Verdict Engine – determines GO / NO-GO / CONDITIONAL for a deal.
// Rules are evaluated in strict priority order: first match wins.
// ---------------------------------------------------------------------------

export interface VerdictInput {
  dealGrade: string | null; // A-F
  dscrScenario1: number | null;
  dscrScenario2: number | null;
  revenueGrowthYoy1: number | null;
  sdeYear1: number | null;
  screeningPassCount: number;
  screeningDiscussCount: number;
  screeningFailCount: number;
  screeningVerdict: string;
  protocolVerdict: string | null;
  criticalRedFlagCount: number;
  memberDscrFloor: number;
}

export interface VerdictResult {
  verdict: 'go' | 'no_go' | 'conditional';
  reasoning: string;
  triggeredRules: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when DSCR is below 1.25 in EVERY available scenario. */
function dscrBelowFloorInAll(s1: number | null, s2: number | null): boolean {
  // If both are null we cannot confirm coverage – do not trigger this rule.
  if (s1 === null && s2 === null) return false;

  const belowS1 = s1 !== null ? s1 < 1.25 : true;
  const belowS2 = s2 !== null ? s2 < 1.25 : true;

  return belowS1 && belowS2;
}

/** True when at least one scenario meets or exceeds the member's DSCR floor. */
function dscrMeetsFloor(
  s1: number | null,
  s2: number | null,
  floor: number,
): boolean {
  if (s1 !== null && s1 >= floor) return true;
  if (s2 !== null && s2 >= floor) return true;
  return false;
}

/** True when the primary (scenario 1) DSCR is between 1.25 and the member floor (exclusive). */
function dscrBetweenBaseAndFloor(
  s1: number | null,
  floor: number,
): boolean {
  if (s1 === null) return false;
  return s1 >= 1.25 && s1 < floor;
}

function gradeRank(grade: string | null): number {
  if (grade === null) return -1;
  const map: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  return map[grade.toUpperCase()] ?? -1;
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function determineVerdict(input: VerdictInput): VerdictResult {
  const triggeredRules: string[] = [];

  // -----------------------------------------------------------------------
  // Phase 1 – Hard NO-GO checks (any single condition is disqualifying)
  // -----------------------------------------------------------------------

  // 1. DSCR < 1.25 in ALL scenarios
  if (dscrBelowFloorInAll(input.dscrScenario1, input.dscrScenario2)) {
    triggeredRules.push(
      `DSCR below 1.25x in all scenarios (S1: ${input.dscrScenario1?.toFixed(2) ?? 'N/A'}, S2: ${input.dscrScenario2?.toFixed(2) ?? 'N/A'})`,
    );
  }

  // 2. Revenue declining > 30% YoY
  if (input.revenueGrowthYoy1 !== null && input.revenueGrowthYoy1 < -30) {
    triggeredRules.push(
      `Revenue declining more than 30% year-over-year (${input.revenueGrowthYoy1.toFixed(1)}%)`,
    );
  }

  // 3. Deal grade = F
  if (input.dealGrade !== null && input.dealGrade.toUpperCase() === 'F') {
    triggeredRules.push(`Deal grade is F – automatic disqualification`);
  }

  // 4. 4+ FAIL screening scores
  if (input.screeningFailCount >= 4) {
    triggeredRules.push(
      `Screening returned ${input.screeningFailCount} FAIL scores (threshold: 4+)`,
    );
  }

  // 5. SDE < $100,000
  if (input.sdeYear1 !== null && input.sdeYear1 < 100_000) {
    triggeredRules.push(
      `SDE below $100,000 (${formatCurrency(input.sdeYear1)})`,
    );
  }

  // If any hard no-go was triggered, return immediately.
  if (triggeredRules.length > 0) {
    return {
      verdict: 'no_go',
      reasoning: buildReasoning('no_go', triggeredRules),
      triggeredRules,
    };
  }

  // -----------------------------------------------------------------------
  // Phase 2 – CONDITIONAL checks
  // -----------------------------------------------------------------------

  // 1. DSCR between 1.25 and member's floor in primary scenario
  if (dscrBetweenBaseAndFloor(input.dscrScenario1, input.memberDscrFloor)) {
    triggeredRules.push(
      `Primary DSCR (${input.dscrScenario1!.toFixed(2)}x) is between 1.25x and member floor of ${input.memberDscrFloor.toFixed(2)}x`,
    );
  }

  // 2. Deal grade = D
  if (input.dealGrade !== null && input.dealGrade.toUpperCase() === 'D') {
    triggeredRules.push(`Deal grade is D – marginal quality`);
  }

  // 3. 2-3 FAIL screening scores
  if (input.screeningFailCount >= 2 && input.screeningFailCount <= 3) {
    triggeredRules.push(
      `Screening returned ${input.screeningFailCount} FAIL scores (range 2-3)`,
    );
  }

  // 4. 1-2 critical red flags (potentially correctable)
  if (input.criticalRedFlagCount >= 1 && input.criticalRedFlagCount <= 2) {
    triggeredRules.push(
      `${input.criticalRedFlagCount} critical red flag(s) identified – potentially correctable`,
    );
  }

  if (triggeredRules.length > 0) {
    return {
      verdict: 'conditional',
      reasoning: buildReasoning('conditional', triggeredRules),
      triggeredRules,
    };
  }

  // -----------------------------------------------------------------------
  // Phase 3 – GO (default when no disqualifiers are present)
  // -----------------------------------------------------------------------

  const goRules: string[] = [];

  // 1. DSCR meets member floor in at least one scenario
  if (dscrMeetsFloor(input.dscrScenario1, input.dscrScenario2, input.memberDscrFloor)) {
    const best = Math.max(input.dscrScenario1 ?? 0, input.dscrScenario2 ?? 0);
    goRules.push(
      `DSCR meets or exceeds member floor of ${input.memberDscrFloor.toFixed(2)}x (best: ${best.toFixed(2)}x)`,
    );
  }

  // 2. Deal grade C or better
  if (gradeRank(input.dealGrade) >= 3) {
    goRules.push(`Deal grade is ${input.dealGrade!.toUpperCase()} – meets quality threshold`);
  }

  // 3. 0-1 FAIL screening scores
  if (input.screeningFailCount <= 1) {
    goRules.push(
      `Screening shows ${input.screeningFailCount} FAIL score(s) – within acceptable range`,
    );
  }

  // 4. No hard disqualifiers
  goRules.push(`No hard disqualifiers identified across all engines`);

  return {
    verdict: 'go',
    reasoning: buildReasoning('go', goRules),
    triggeredRules: goRules,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function buildReasoning(verdict: 'go' | 'no_go' | 'conditional', rules: string[]): string {
  const header: Record<typeof verdict, string> = {
    go: 'VERDICT: GO — This deal meets all underwriting criteria and is recommended for pursuit.',
    no_go:
      'VERDICT: NO-GO — This deal fails one or more hard disqualification criteria and is not recommended.',
    conditional:
      'VERDICT: CONDITIONAL — This deal has factors that require further review or negotiation before a final decision.',
  };

  const lines = [header[verdict], ''];
  rules.forEach((r, i) => {
    lines.push(`  ${i + 1}. ${r}`);
  });

  return lines.join('\n');
}

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString('en-US');
}
