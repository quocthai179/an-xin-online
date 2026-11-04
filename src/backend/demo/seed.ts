import { buildSeed } from '@/lib/seed';
import { emptyDb, type CandRow, type DemoDb, type UserRow } from './db';

export const BOT_HRS: { id: string; name: string; company: string }[] = [
  { id: 'bot-hr-1', name: 'Chị Hạnh Tuyển Dụng', company: 'Công ty Mẫu A' },
  { id: 'bot-hr-2', name: 'Anh Tuấn Headhunter', company: 'Công ty Mẫu B' },
  { id: 'bot-hr-3', name: 'Cô Lan Nhân Sự', company: 'Công ty Mẫu C' },
];

/** Seeds an empty DemoDb: sample candidates (labelled "Mẫu") with synthetic history, plus bot HR profiles. */
export function seedDb(now: number): DemoDb {
  const db = emptyDb();
  for (const s of buildSeed(now)) {
    const row: CandRow = {
      id: s.id,
      userId: null,
      slug: s.slug,
      isSample: true,
      displayName: s.displayName,
      zone: s.zone,
      signText: s.signText,
      title: s.title,
      yearsExp: s.yearsExp,
      skills: s.skills,
      salaryMin: s.salaryMin,
      salaryMax: s.salaryMax,
      salaryNegotiable: s.salaryNegotiable,
      city: s.city,
      workModes: s.workModes,
      bio: s.bio,
      avatar: s.avatar,
      status: 'sitting',
      signState: 'ok',
      hideFromTicker: false,
      showSalaryOnCard: false,
      sittingSince: s.sittingSince,
      zoneChangedAt: null,
      placedAt: null,
      placedCompany: null,
      xuTotal: s.xuTotal,
      loveTotal: s.loveTotal,
      inviteTotal: 0,
      incenseTotal: 0,
      reportCount: 0,
      createdAt: s.createdAt,
      updatedAt: now,
    };
    db.candidates[row.id] = row;
    db.daily[row.id] = s.daily.map((d) => ({ ...d }));
  }
  BOT_HRS.forEach((b, i) => {
    const u: UserRow = {
      id: b.id,
      displayName: b.name,
      role: 'hr',
      company: b.company,
      avatar: { skin: i, shirt: i + 2, pants: i, hat: 'none', bowl: 'bowl' },
      createdAt: now,
      nameChangedAt: null,
      isBot: true,
    };
    db.users[u.id] = u;
  });
  return db;
}
