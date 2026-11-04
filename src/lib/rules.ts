// Single source of truth for business constants. Mirrored in private.cfg() of the LATEST migration that defines it
// (supabase/migrations/0002_hardening.sql). tests/parity/sql-config.test.ts keeps both in sync.

export const TZ = 'Asia/Ho_Chi_Minh';
export const ZONE_IDS = [
  'backend',
  'frontend',
  'design',
  'mobile',
  'data_ai',
  'qa',
  'pm_ba',
  'devops',
  'fresher',
  'other',
] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const LIMITS = {
  zones: ZONE_IDS,
  xu: { perDay: 10, perCandidatePerDay: 2 },
  love: { perDay: 5, perCandidatePerDay: 1, perIpPerDay: 30 },
  invite: {
    perDay: 3,
    cooldownDays: 7,
    maxOpenPerCandidate: 5,
    expireDays: 14,
    messageMin: 10,
    messageMax: 200,
    contactMin: 3,
    contactMax: 120,
  },
  offer: { maxOpenPerHr: 3, expireDays: 7, positionMax: 60, packageMax: 100, messageMax: 300 },
  giftOpsPerSecond: 5,
  profileCreatePer10Min: 1,
  signEditsPerHour: 10,
  zoneChangeHours: 24,
  nameChangeHours: 24,
  hrSignupsPerIpPerHour: 3,
  /** distinct counted reporters that auto-hide a sign (AC-20.2; raised from 3 by the 2026-11-04 security audit M2) */
  reportsToHideSign: 5,
  reportsPerDay: 20,
  seatsPerZone: 30,
  rank: { halfLifeDays: 7, windowDays: 60, loveDailyCap: 20 },
  /** reports from profiles younger than this are stored but not counted toward reportsToHideSign (anti-brigading) */
  reporterMinAgeMinutes: 60,
  /** no 500k within this many minutes after the profile became HR (TOO_NEW) */
  hrInviteMinAgeMinutes: 10,
  /** contact reveals per HR per hour (get_candidate_contact) */
  contactViewsPerHour: 20,
  profileUpdatesPerMinute: 5,
  statusChangesPerMinute: 4,
  /** candidate profile creations per user per VN day (delete + recreate cap) */
  candidateCreatesPerDay: 3,
  /** placed candidates stay on the street listing this many days after placed_at */
  placedVisibleDays: 30,
  /** max rows of list_candidates (sitting first, newest first) */
  listMax: 3000,
  /** rate-limit counters (incl. hashed IPs) are purged after this many hours */
  rateRetentionHours: 25,
} as const;

export const FIELD_LIMITS = {
  nameMin: 2,
  nameMax: 24,
  companyMin: 2,
  companyMax: 40,
  signMin: 5,
  signMax: 80,
  titleMax: 60,
  yearsMax: 50,
  skillsMin: 1,
  skillsMax: 10,
  skillLen: 20,
  salaryMax: 1000,
  cityMax: 40,
  bioMax: 280,
  contactMax: 120,
  reasonMax: 200,
  noteMax: 200,
} as const;

export const RANK = {
  hrCoin: 3,
  love: 0.3,
  invite: 20,
  inviteAccepted: 10,
  sitPerDay: 2,
  sitCapDays: 30,
  completeness: 1,
  newcomerBoost: 5,
  newcomerHours: 24,
  ...LIMITS.rank,
} as const;

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
