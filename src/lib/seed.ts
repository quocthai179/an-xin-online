import type { AvatarSpec, WorkMode } from '@/backend/types';
import { DAY_MS } from './rules';
import type { ZoneId } from './rules';
import { fnv1a32, mulberry32 } from './hash';
import { vnDay } from './time';
import type { DailyBucket } from './ranking';
import { profileCompleteness } from './ranking';

interface SeedDef {
  zone: ZoneId;
  name: string;
  sign: string;
  title: string;
  years: number;
  skills: string[];
  city: string;
  modes: WorkMode[];
  bio?: string;
  salary?: [number, number];
}

// All sample candidates are fictional, labelled "Mẫu" in the UI, and cannot receive real 500k invitations.
const DEFS: SeedDef[] = [
  { zone: 'backend', name: 'Dev Hẻm Số 7', sign: 'Java 5 năm, nhà còn mẹ già, xin job remote', title: 'Backend Developer', years: 5, skills: ['Java', 'Spring', 'PostgreSQL'], city: 'Hà Nội', modes: ['remote', 'hybrid'], bio: 'Debug bằng println từ năm 2019, vẫn sống khỏe.', salary: [25, 40] },
  { zone: 'backend', name: 'Anh Query Chậm', sign: 'Viết API nhanh hơn tốc độ sếp đổi yêu cầu', title: 'Senior Backend', years: 7, skills: ['Go', 'Redis', 'Kafka'], city: 'TP.HCM', modes: ['hybrid'], salary: [40, 60] },
  { zone: 'backend', name: 'Cô Thực Tập Muộn', sign: 'Query 3 giây chạy ngon, deploy thứ Sáu vẫn sống', title: 'Backend Engineer', years: 3, skills: ['Node.js', 'MySQL', 'Docker'], city: 'Đà Nẵng', modes: ['remote'], bio: 'Tin rằng mọi bug đều có nguyên nhân, chỉ chưa tìm ra.' },
  { zone: 'backend', name: 'Bạn Null Pointer', sign: 'Thuộc lòng NullPointerException, xin một chỗ ngồi', title: 'Java Developer', years: 2, skills: ['Java', 'Maven'], city: 'Hà Nội', modes: ['onsite'] },

  { zone: 'frontend', name: 'Em Div Lệch', sign: 'Căn giữa div được ngay lần đầu, xin việc', title: 'Frontend Developer', years: 3, skills: ['React', 'TypeScript', 'CSS'], city: 'TP.HCM', modes: ['remote', 'hybrid'], salary: [20, 35] },
  { zone: 'frontend', name: 'Chị useEffect', sign: 'Làm 5 năm React, vẫn chưa hiểu useEffect', title: 'Senior Frontend', years: 5, skills: ['React', 'Next.js', 'Jest'], city: 'Hà Nội', modes: ['remote'], bio: 'Biết dependency array là gì, chỉ chưa biết điền gì vào.' },
  { zone: 'frontend', name: 'Pixel Perfectionist', sign: 'Pixel perfect hoặc không làm gì hết', title: 'UI Engineer', years: 4, skills: ['Vue', 'Sass', 'Figma'], city: 'Đà Nẵng', modes: ['hybrid'] },
  { zone: 'frontend', name: 'Anh IE Mười Một', sign: 'Sửa bug IE11 giùm sếp, đổi lại bát cơm', title: 'Web Developer', years: 8, skills: ['JavaScript', 'jQuery', 'HTML'], city: 'Cần Thơ', modes: ['onsite', 'hybrid'], salary: [18, 28] },

  { zone: 'design', name: 'Cô Logo To Lên', sign: 'Thiết kế xong khách bảo to logo lên, xin việc', title: 'Graphic Designer', years: 4, skills: ['Illustrator', 'Photoshop', 'Branding'], city: 'TP.HCM', modes: ['hybrid'], salary: [15, 25] },
  { zone: 'design', name: 'Bạn Một Trăm Frame', sign: 'Figma 100 frame, khách chọn frame số 1', title: 'UI/UX Designer', years: 3, skills: ['Figma', 'Prototyping', 'Research'], city: 'Hà Nội', modes: ['remote', 'hybrid'], bio: 'Vẽ nhanh, giải thích chậm, chờ feedback rất lâu.' },
  { zone: 'design', name: 'Anh Sửa Lần Hai Mươi', sign: 'Đã vẽ đẹp, xin bớt sửa 20 lần', title: 'Product Designer', years: 6, skills: ['Figma', 'Design System', 'Motion'], city: 'TP.HCM', modes: ['remote'] },
  { zone: 'design', name: 'Chị Hai Màu Xanh', sign: 'Màu xanh này khác màu xanh kia ở đâu, xin việc', title: 'Visual Designer', years: 2, skills: ['Sketch', 'Color', 'Typography'], city: 'Huế', modes: ['onsite', 'remote'] },

  { zone: 'mobile', name: 'Em Crash Riêng Tui', sign: 'App crash trên máy tui thôi, xin job mới', title: 'Android Developer', years: 3, skills: ['Kotlin', 'Jetpack', 'Firebase'], city: 'Hà Nội', modes: ['hybrid'], salary: [22, 35] },
  { zone: 'mobile', name: 'Bạn Hai Hệ Điều Hành', sign: 'iOS và Android đều làm, ngủ thì chưa', title: 'Mobile Developer', years: 5, skills: ['Swift', 'Kotlin', 'React Native'], city: 'TP.HCM', modes: ['remote', 'hybrid'] },
  { zone: 'mobile', name: 'Anh Hot Reload', sign: 'Flutter hot reload, đời tui chưa reload', title: 'Flutter Developer', years: 2, skills: ['Flutter', 'Dart', 'Bloc'], city: 'Đà Nẵng', modes: ['remote'], bio: 'Mê UI mượt, mê nhất là lúc app được duyệt.' },
  { zone: 'mobile', name: 'Chị Chờ Duyệt', sign: 'Chờ duyệt App Store lâu hơn chờ tin nhắn trả lời', title: 'iOS Developer', years: 6, skills: ['Swift', 'SwiftUI', 'Xcode'], city: 'TP.HCM', modes: ['hybrid', 'onsite'], salary: [35, 55] },

  { zone: 'data_ai', name: 'Mô Hình Chạy Trên Notebook', sign: 'Model accuracy 99% trên tập train, xin việc', title: 'ML Engineer', years: 3, skills: ['Python', 'PyTorch', 'SQL'], city: 'Hà Nội', modes: ['remote'], salary: [30, 50] },
  { zone: 'data_ai', name: 'Anh Dọn Data', sign: 'Dọn data cả ngày, train chưa tới 5 phút', title: 'Data Engineer', years: 4, skills: ['Python', 'Airflow', 'Spark'], city: 'TP.HCM', modes: ['hybrid'] },
  { zone: 'data_ai', name: 'Cô Prompt Thần Thánh', sign: 'Prompt giỏi hơn viết CV, xin một chỗ ngồi', title: 'AI Engineer', years: 2, skills: ['LLM', 'Python', 'RAG'], city: 'Đà Nẵng', modes: ['remote', 'hybrid'], bio: 'Biết nhờ máy viết giùm, và biết kiểm tra lại.' },
  { zone: 'data_ai', name: 'Bạn Excel Mạnh', sign: 'SQL ngon, Excel ngon, tình duyên chưa ngon', title: 'Data Analyst', years: 3, skills: ['SQL', 'Excel', 'Power BI'], city: 'Hà Nội', modes: ['onsite', 'hybrid'], salary: [15, 25] },

  { zone: 'qa', name: 'Thợ Săn Bug', sign: 'Tìm bug nhanh hơn dev viết ra bug', title: 'QA Engineer', years: 4, skills: ['Selenium', 'Postman', 'Jira'], city: 'TP.HCM', modes: ['hybrid'], salary: [18, 30] },
  { zone: 'qa', name: 'Chị Release Đêm Qua', sign: 'Test xong đêm trước release, sáng nghe tin mới', title: 'Senior QA', years: 6, skills: ['Cypress', 'API Testing', 'CI'], city: 'Hà Nội', modes: ['remote'] },
  { zone: 'qa', name: 'Anh Tính Năng Không Bug', sign: 'Không phải bug, là tính năng, xin việc test', title: 'Manual Tester', years: 2, skills: ['Test Case', 'Jira', 'SQL'], city: 'Cần Thơ', modes: ['onsite'], bio: 'Nhìn vào là biết chỗ nào sắp lỗi.' },
  { zone: 'qa', name: 'Em Click Thử Nghìn Lần', sign: 'Click thử 1000 lần, bug chỉ lên lần 1001', title: 'Automation Tester', years: 3, skills: ['Playwright', 'TypeScript', 'Git'], city: 'Đà Nẵng', modes: ['remote', 'hybrid'] },

  { zone: 'pm_ba', name: 'Chị Họp Tám Tiếng', sign: 'Họp 8 tiếng làm 2 tiếng, xin job ít họp', title: 'Project Manager', years: 8, skills: ['Scrum', 'Jira', 'Stakeholder'], city: 'TP.HCM', modes: ['hybrid'], salary: [40, 70] },
  { zone: 'pm_ba', name: 'Anh User Story', sign: 'Viết user story rõ, khách đổi ý còn rõ hơn', title: 'Business Analyst', years: 5, skills: ['BPMN', 'SQL', 'Figma'], city: 'Hà Nội', modes: ['hybrid', 'onsite'], bio: 'Chuyên phiên dịch từ tiếng khách sang tiếng dev.' },
  { zone: 'pm_ba', name: 'Cô Scope Mới', sign: 'Deadline hôm qua, scope mới hôm nay, xin việc', title: 'Product Manager', years: 4, skills: ['Roadmap', 'Analytics', 'Discovery'], city: 'Hà Nội', modes: ['remote'] },
  { zone: 'pm_ba', name: 'Bạn Biết Nói Không', sign: 'Biết nói không với khách, chưa biết nói với mẹ', title: 'Scrum Master', years: 3, skills: ['Scrum', 'Kanban', 'Coaching'], city: 'Đà Nẵng', modes: ['hybrid'] },

  { zone: 'devops', name: 'Anh Pipeline Xanh', sign: 'CI xanh mà ví vẫn đỏ, xin job mới', title: 'DevOps Engineer', years: 5, skills: ['Docker', 'Kubernetes', 'Terraform'], city: 'TP.HCM', modes: ['remote', 'hybrid'], salary: [35, 60] },
  { zone: 'devops', name: 'Em Chạy Trên Máy Tui', sign: 'Docker chạy được trên máy tui, xin việc', title: 'Junior DevOps', years: 1, skills: ['Docker', 'Linux', 'Bash'], city: 'Hà Nội', modes: ['onsite'] },
  { zone: 'devops', name: 'Chị Ba Giờ Sáng', sign: 'Server sập lúc 3 giờ sáng vẫn dậy fix', title: 'SRE', years: 6, skills: ['AWS', 'Prometheus', 'Go'], city: 'TP.HCM', modes: ['remote'], bio: 'Báo thức duy nhất tui sợ là báo thức của PagerDuty.' },
  { zone: 'devops', name: 'Bạn Hóa Đơn Mây', sign: 'Cloud bill giảm 40%, lương chưa tăng', title: 'Cloud Engineer', years: 4, skills: ['Azure', 'FinOps', 'Terraform'], city: 'Đà Nẵng', modes: ['hybrid'] },

  { zone: 'fresher', name: 'Em Mới Ra Trường', sign: 'Mới ra trường, CV trắng, tinh thần đỏ lửa', title: 'Fresher Developer', years: 0, skills: ['Java', 'Git', 'SQL'], city: 'Hà Nội', modes: ['onsite', 'hybrid'] },
  { zone: 'fresher', name: 'Bạn Hello World', sign: 'Fresher thông thạo Hello World, xin ai chỉ thêm', title: 'Intern Developer', years: 0, skills: ['Python', 'HTML', 'Git'], city: 'TP.HCM', modes: ['onsite'], bio: 'Học nhanh, hỏi nhiều, rửa ly cũng được.' },
  { zone: 'fresher', name: 'Em Trà Đá', sign: 'Intern nhận trà đá và lời khen, xin cơ hội', title: 'Frontend Intern', years: 0, skills: ['React', 'JavaScript', 'CSS'], city: 'Huế', modes: ['hybrid'] },
  { zone: 'fresher', name: 'Bạn Google Bốn Năm', sign: 'Học Google 4 năm đại học, giờ xin học có lương', title: 'Fresher Tester', years: 0, skills: ['Testing', 'SQL', 'Excel'], city: 'Cần Thơ', modes: ['onsite', 'remote'] },

  { zone: 'other', name: 'Cô Content Nghìn Chữ', sign: 'Viết content nghìn chữ, đọc lại còn thấy hay', title: 'Content Writer', years: 3, skills: ['SEO', 'Copywriting', 'Canva'], city: 'Hà Nội', modes: ['remote'], salary: [12, 20] },
  { zone: 'other', name: 'Anh Bán Giấc Mơ', sign: 'Làm sale giỏi, bán được cả giấc mơ', title: 'Sales Executive', years: 5, skills: ['B2B', 'CRM', 'Negotiation'], city: 'TP.HCM', modes: ['onsite'] },
  { zone: 'other', name: 'Chị Cân Đối Sổ', sign: 'Kế toán cân đối sổ, chưa cân đối đời', title: 'Kế toán tổng hợp', years: 6, skills: ['Excel', 'MISA', 'Thuế'], city: 'Đà Nẵng', modes: ['onsite', 'hybrid'] },
  { zone: 'other', name: 'Bạn Đa Năng', sign: 'Đa năng: sửa máy in, cài Win, an ủi sếp', title: 'IT Support', years: 4, skills: ['Windows', 'Network', 'Helpdesk'], city: 'Hà Nội', modes: ['onsite'], bio: 'Câu cửa miệng: bạn thử khởi động lại chưa?' },
];

export interface SeedRecord {
  id: string;
  slug: string;
  displayName: string;
  zone: ZoneId;
  signText: string;
  title: string;
  yearsExp: number;
  skills: string[];
  city: string;
  workModes: WorkMode[];
  bio: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  avatar: AvatarSpec;
  sittingSince: number;
  createdAt: number;
  completeness: number;
  xuTotal: number;
  loveTotal: number;
  daily: DailyBucket[];
}

const HATS: AvatarSpec['hat'][] = ['non_la', 'cap', 'beanie', 'none'];
const BOWLS: AvatarSpec['bowl'][] = ['bowl', 'hat', 'box'];

export function seedSlug(i: number): string {
  return `mau-${DEFS[i].zone.replace('_', '-')}-${(i % 4) + 1}`;
}

export const SEED_COUNT = DEFS.length;

/** Deterministic sample candidates relative to `nowMs` so seat orders vary but are stable per call time. */
export function buildSeed(nowMs: number): SeedRecord[] {
  return DEFS.map((d, i) => {
    const slug = seedSlug(i);
    const rnd = mulberry32(fnv1a32(slug));
    const sitDays = 1 + Math.floor(rnd() * 40);
    const createdAt = nowMs - (sitDays + 1) * DAY_MS;
    const daily: DailyBucket[] = [];
    let xu = 0;
    let love = 0;
    for (let a = 0; a < Math.min(sitDays, 14); a++) {
      const bx = rnd() < 0.55 ? Math.floor(rnd() * 5) : 0;
      const bl = rnd() < 0.6 ? Math.floor(rnd() * 8) : 0;
      if (bx + bl === 0) continue;
      daily.push({ day: vnDay(nowMs - a * DAY_MS), xu: bx, love: bl, invites: 0, invitesAccepted: 0 });
      xu += bx;
      love += bl;
    }
    const avatar: AvatarSpec = {
      skin: Math.floor(rnd() * 5),
      shirt: Math.floor(rnd() * 8),
      pants: Math.floor(rnd() * 4),
      hat: HATS[Math.floor(rnd() * HATS.length)],
      bowl: BOWLS[Math.floor(rnd() * BOWLS.length)],
    };
    return {
      id: `seed-${slug}`,
      slug,
      displayName: d.name,
      zone: d.zone,
      signText: d.sign,
      title: d.title,
      yearsExp: d.years,
      skills: d.skills,
      city: d.city,
      workModes: d.modes,
      bio: d.bio ?? null,
      salaryMin: d.salary?.[0] ?? null,
      salaryMax: d.salary?.[1] ?? null,
      salaryNegotiable: !d.salary,
      avatar,
      sittingSince: nowMs - sitDays * DAY_MS,
      createdAt,
      completeness: profileCompleteness({
        salaryMin: d.salary?.[0] ?? null,
        salaryMax: d.salary?.[1] ?? null,
        salaryNegotiable: !d.salary,
        bio: d.bio ?? null,
        city: d.city,
        workModes: d.modes,
        skills: d.skills,
      }),
      xuTotal: xu,
      loveTotal: love,
      daily,
    };
  });
}

export function findSeedBySlug(slug: string, nowMs: number): SeedRecord | undefined {
  return buildSeed(nowMs).find((s) => s.slug === slug);
}
