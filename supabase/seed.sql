-- GENERATED from src/lib/seed.ts by tests/parity/seed-sql.test.ts (GEN_SEED=1). Do not edit by hand.
-- Sample candidates ("Mẫu"): fictional, no owner (user_id null), cannot receive real 500k invitations (SAMPLE_CANDIDATE).
-- Dates are relative to the moment the seed runs, so ranking decay and sitting time stay realistic.
-- Safe to run more than once (on conflict do nothing).

begin;
insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-backend-1', true, 'Dev Hẻm Số 7', 'backend', 'Java 5 năm, nhà còn mẹ già, xin job remote', 'Backend Developer', 5, array['Java', 'Spring', 'PostgreSQL']::text[],
  25, 40, false, 'Hà Nội', array['remote', 'hybrid']::text[],
  'Debug bằng println từ năm 2019, vẫn sống khỏe.', '{"skin":3,"shirt":5,"pants":2,"hat":"beanie","bowl":"bowl"}'::jsonb,
  now() - interval '3 days', now() - interval '4 days', 4, 7)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 3, 7 from public.candidates where slug = 'mau-backend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 1, 0 from public.candidates where slug = 'mau-backend-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-backend-2', true, 'Anh Query Chậm', 'backend', 'Viết API nhanh hơn tốc độ sếp đổi yêu cầu', 'Senior Backend', 7, array['Go', 'Redis', 'Kafka']::text[],
  40, 60, false, 'TP.HCM', array['hybrid']::text[],
  null, '{"skin":0,"shirt":1,"pants":2,"hat":"beanie","bowl":"box"}'::jsonb,
  now() - interval '39 days', now() - interval '40 days', 16, 24)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 2, 0 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 2, 0 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 5 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 7 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 3, 0 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 1 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 1, 1 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 6 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 4 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 4, 0 from public.candidates where slug = 'mau-backend-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-backend-3', true, 'Cô Thực Tập Muộn', 'backend', 'Query 3 giây chạy ngon, deploy thứ Sáu vẫn sống', 'Backend Engineer', 3, array['Node.js', 'MySQL', 'Docker']::text[],
  null, null, true, 'Đà Nẵng', array['remote']::text[],
  'Tin rằng mọi bug đều có nguyên nhân, chỉ chưa tìm ra.', '{"skin":4,"shirt":6,"pants":3,"hat":"none","bowl":"bowl"}'::jsonb,
  now() - interval '29 days', now() - interval '30 days', 32, 22)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 4, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 5 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 2 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 5 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 2, 6 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 4, 4 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 4, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 0 from public.candidates where slug = 'mau-backend-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-backend-4', true, 'Bạn Null Pointer', 'backend', 'Thuộc lòng NullPointerException, xin một chỗ ngồi', 'Java Developer', 2, array['Java', 'Maven']::text[],
  null, null, true, 'Hà Nội', array['onsite']::text[],
  null, '{"skin":1,"shirt":4,"pants":3,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '21 days', now() - interval '22 days', 21, 23)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 3 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 1 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 4, 0 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 0 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 1, 1 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 2, 6 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 4, 7 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 3 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 4, 0 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 2 from public.candidates where slug = 'mau-backend-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-frontend-1', true, 'Em Div Lệch', 'frontend', 'Căn giữa div được ngay lần đầu, xin việc', 'Frontend Developer', 3, array['React', 'TypeScript', 'CSS']::text[],
  20, 35, false, 'TP.HCM', array['remote', 'hybrid']::text[],
  null, '{"skin":2,"shirt":1,"pants":1,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '24 days', now() - interval '25 days', 28, 34)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 3, 0 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 7 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 1, 0 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 7 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 0 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 1 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 1, 3 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 3, 0 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 3 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 0 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 4, 7 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 2, 2 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 1, 4 from public.candidates where slug = 'mau-frontend-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-frontend-2', true, 'Chị useEffect', 'frontend', 'Làm 5 năm React, vẫn chưa hiểu useEffect', 'Senior Frontend', 5, array['React', 'Next.js', 'Jest']::text[],
  null, null, true, 'Hà Nội', array['remote']::text[],
  'Biết dependency array là gì, chỉ chưa biết điền gì vào.', '{"skin":4,"shirt":1,"pants":0,"hat":"cap","bowl":"hat"}'::jsonb,
  now() - interval '35 days', now() - interval '36 days', 17, 24)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 2, 2 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 0 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 3 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 3, 3 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 4 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 1 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 1 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 5 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 3, 0 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 5 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 3, 0 from public.candidates where slug = 'mau-frontend-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-frontend-3', true, 'Pixel Perfectionist', 'frontend', 'Pixel perfect hoặc không làm gì hết', 'UI Engineer', 4, array['Vue', 'Sass', 'Figma']::text[],
  null, null, true, 'Đà Nẵng', array['hybrid']::text[],
  null, '{"skin":3,"shirt":2,"pants":0,"hat":"none","bowl":"bowl"}'::jsonb,
  now() - interval '15 days', now() - interval '16 days', 16, 30)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 2, 3 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 2, 2 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 6 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 2, 4 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 1, 7 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 1, 5 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 2, 0 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 3, 0 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 1, 0 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 2, 0 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 3 from public.candidates where slug = 'mau-frontend-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-frontend-4', true, 'Anh IE Mười Một', 'frontend', 'Sửa bug IE11 giùm sếp, đổi lại bát cơm', 'Web Developer', 8, array['JavaScript', 'jQuery', 'HTML']::text[],
  18, 28, false, 'Cần Thơ', array['onsite', 'hybrid']::text[],
  null, '{"skin":2,"shirt":2,"pants":1,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '24 days', now() - interval '25 days', 16, 27)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 2, 0 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 3, 0 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 5 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 0 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 1, 0 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 4, 6 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 3 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 5 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 4, 6 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 0, 2 from public.candidates where slug = 'mau-frontend-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-design-1', true, 'Cô Logo To Lên', 'design', 'Thiết kế xong khách bảo to logo lên, xin việc', 'Graphic Designer', 4, array['Illustrator', 'Photoshop', 'Branding']::text[],
  15, 25, false, 'TP.HCM', array['hybrid']::text[],
  null, '{"skin":4,"shirt":2,"pants":0,"hat":"cap","bowl":"hat"}'::jsonb,
  now() - interval '27 days', now() - interval '28 days', 13, 47)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 2 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 4 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 4, 0 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 1, 6 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 7 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 6 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 4, 0 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 5 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 6 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 0, 7 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 4 from public.candidates where slug = 'mau-design-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-design-2', true, 'Bạn Một Trăm Frame', 'design', 'Figma 100 frame, khách chọn frame số 1', 'UI/UX Designer', 3, array['Figma', 'Prototyping', 'Research']::text[],
  null, null, true, 'Hà Nội', array['remote', 'hybrid']::text[],
  'Vẽ nhanh, giải thích chậm, chờ feedback rất lâu.', '{"skin":1,"shirt":0,"pants":0,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '22 days', now() - interval '23 days', 23, 26)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 2, 6 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 3, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 3 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 0, 7 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 6 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 4, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 2, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 4 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 4, 0 from public.candidates where slug = 'mau-design-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-design-3', true, 'Anh Sửa Lần Hai Mươi', 'design', 'Đã vẽ đẹp, xin bớt sửa 20 lần', 'Product Designer', 6, array['Figma', 'Design System', 'Motion']::text[],
  null, null, true, 'TP.HCM', array['remote']::text[],
  null, '{"skin":4,"shirt":5,"pants":0,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '34 days', now() - interval '35 days', 16, 27)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 4 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 5 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 5 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 3, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 4, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 6 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 1, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 7 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 4, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 1, 0 from public.candidates where slug = 'mau-design-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-design-4', true, 'Chị Hai Màu Xanh', 'design', 'Màu xanh này khác màu xanh kia ở đâu, xin việc', 'Visual Designer', 2, array['Sketch', 'Color', 'Typography']::text[],
  null, null, true, 'Huế', array['onsite', 'remote']::text[],
  null, '{"skin":4,"shirt":2,"pants":2,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '25 days', now() - interval '26 days', 17, 23)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 3, 0 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 7 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 0, 2 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 5 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 4, 4 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 2 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 0 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 2 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 2, 1 from public.candidates where slug = 'mau-design-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-mobile-1', true, 'Em Crash Riêng Tui', 'mobile', 'App crash trên máy tui thôi, xin job mới', 'Android Developer', 3, array['Kotlin', 'Jetpack', 'Firebase']::text[],
  22, 35, false, 'Hà Nội', array['hybrid']::text[],
  null, '{"skin":2,"shirt":6,"pants":1,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '31 days', now() - interval '32 days', 21, 37)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 6 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 6 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 3 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 4 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 0 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 1, 2 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 3, 0 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 6 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 2, 0 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 0 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 3 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 0, 7 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 4, 0 from public.candidates where slug = 'mau-mobile-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-mobile-2', true, 'Bạn Hai Hệ Điều Hành', 'mobile', 'iOS và Android đều làm, ngủ thì chưa', 'Mobile Developer', 5, array['Swift', 'Kotlin', 'React Native']::text[],
  null, null, true, 'TP.HCM', array['remote', 'hybrid']::text[],
  null, '{"skin":3,"shirt":1,"pants":3,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '15 days', now() - interval '16 days', 7, 13)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 3, 2 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 3 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 3 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 1 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 2 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 1 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 1 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 1, 0 from public.candidates where slug = 'mau-mobile-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-mobile-3', true, 'Anh Hot Reload', 'mobile', 'Flutter hot reload, đời tui chưa reload', 'Flutter Developer', 2, array['Flutter', 'Dart', 'Bloc']::text[],
  null, null, true, 'Đà Nẵng', array['remote']::text[],
  'Mê UI mượt, mê nhất là lúc app được duyệt.', '{"skin":1,"shirt":0,"pants":1,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '35 days', now() - interval '36 days', 17, 34)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 7 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 2, 4 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 7 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 1 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 1 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 1, 4 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 2 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 2 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 0 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 4, 6 from public.candidates where slug = 'mau-mobile-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-mobile-4', true, 'Chị Chờ Duyệt', 'mobile', 'Chờ duyệt App Store lâu hơn chờ tin nhắn trả lời', 'iOS Developer', 6, array['Swift', 'SwiftUI', 'Xcode']::text[],
  35, 55, false, 'TP.HCM', array['hybrid', 'onsite']::text[],
  null, '{"skin":3,"shirt":3,"pants":1,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '27 days', now() - interval '28 days', 15, 9)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 3, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 1, 3 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 5 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 1, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 1, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 1, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 1 from public.candidates where slug = 'mau-mobile-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-data-ai-1', true, 'Mô Hình Chạy Trên Notebook', 'data_ai', 'Model accuracy 99% trên tập train, xin việc', 'ML Engineer', 3, array['Python', 'PyTorch', 'SQL']::text[],
  30, 50, false, 'Hà Nội', array['remote']::text[],
  null, '{"skin":3,"shirt":3,"pants":3,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '23 days', now() - interval '24 days', 14, 22)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 1, 1 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 4 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 5 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 2, 0 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 2, 3 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 4, 7 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 1, 0 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 2, 2 from public.candidates where slug = 'mau-data-ai-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-data-ai-2', true, 'Anh Dọn Data', 'data_ai', 'Dọn data cả ngày, train chưa tới 5 phút', 'Data Engineer', 4, array['Python', 'Airflow', 'Spark']::text[],
  null, null, true, 'TP.HCM', array['hybrid']::text[],
  null, '{"skin":3,"shirt":7,"pants":2,"hat":"beanie","bowl":"bowl"}'::jsonb,
  now() - interval '9 days', now() - interval '10 days', 9, 14)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 4 from public.candidates where slug = 'mau-data-ai-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 1, 1 from public.candidates where slug = 'mau-data-ai-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 4 from public.candidates where slug = 'mau-data-ai-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 3, 0 from public.candidates where slug = 'mau-data-ai-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 1, 5 from public.candidates where slug = 'mau-data-ai-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-data-ai-3', true, 'Cô Prompt Thần Thánh', 'data_ai', 'Prompt giỏi hơn viết CV, xin một chỗ ngồi', 'AI Engineer', 2, array['LLM', 'Python', 'RAG']::text[],
  null, null, true, 'Đà Nẵng', array['remote', 'hybrid']::text[],
  'Biết nhờ máy viết giùm, và biết kiểm tra lại.', '{"skin":2,"shirt":3,"pants":0,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '19 days', now() - interval '20 days', 10, 34)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 3 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 3 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 4 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 5 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 1 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 4 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 7 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 3, 0 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 2 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 5 from public.candidates where slug = 'mau-data-ai-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-data-ai-4', true, 'Bạn Excel Mạnh', 'data_ai', 'SQL ngon, Excel ngon, tình duyên chưa ngon', 'Data Analyst', 3, array['SQL', 'Excel', 'Power BI']::text[],
  15, 25, false, 'Hà Nội', array['onsite', 'hybrid']::text[],
  null, '{"skin":3,"shirt":6,"pants":0,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '17 days', now() - interval '18 days', 16, 29)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 3, 0 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 7 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 1 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 0 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 1, 0 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 1 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 3, 4 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 6 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 4 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 2, 6 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 4, 0 from public.candidates where slug = 'mau-data-ai-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-qa-1', true, 'Thợ Săn Bug', 'qa', 'Tìm bug nhanh hơn dev viết ra bug', 'QA Engineer', 4, array['Selenium', 'Postman', 'Jira']::text[],
  18, 30, false, 'TP.HCM', array['hybrid']::text[],
  null, '{"skin":0,"shirt":2,"pants":3,"hat":"cap","bowl":"bowl"}'::jsonb,
  now() - interval '12 days', now() - interval '13 days', 22, 45)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 1, 5 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 7 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 0 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 4, 4 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 0, 5 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 7 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 7 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 2, 7 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 3, 3 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-qa-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-qa-2', true, 'Chị Release Đêm Qua', 'qa', 'Test xong đêm trước release, sáng nghe tin mới', 'Senior QA', 6, array['Cypress', 'API Testing', 'CI']::text[],
  null, null, true, 'Hà Nội', array['remote']::text[],
  null, '{"skin":2,"shirt":0,"pants":3,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '8 days', now() - interval '9 days', 17, 8)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 6 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 4, 0 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 3, 1 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 4, 0 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 1 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 3, 0 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 1, 0 from public.candidates where slug = 'mau-qa-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-qa-3', true, 'Anh Tính Năng Không Bug', 'qa', 'Không phải bug, là tính năng, xin việc test', 'Manual Tester', 2, array['Test Case', 'Jira', 'SQL']::text[],
  null, null, true, 'Cần Thơ', array['onsite']::text[],
  'Nhìn vào là biết chỗ nào sắp lỗi.', '{"skin":2,"shirt":2,"pants":3,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '20 days', now() - interval '21 days', 13, 21)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 2, 0 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 1, 0 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 0 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 3 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 3 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 2, 1 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 1 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 2 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 1, 4 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 0 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 2, 7 from public.candidates where slug = 'mau-qa-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-qa-4', true, 'Em Click Thử Nghìn Lần', 'qa', 'Click thử 1000 lần, bug chỉ lên lần 1001', 'Automation Tester', 3, array['Playwright', 'TypeScript', 'Git']::text[],
  null, null, true, 'Đà Nẵng', array['remote', 'hybrid']::text[],
  null, '{"skin":0,"shirt":6,"pants":0,"hat":"none","bowl":"bowl"}'::jsonb,
  now() - interval '4 days', now() - interval '5 days', 6, 4)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 4, 1 from public.candidates where slug = 'mau-qa-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 2, 0 from public.candidates where slug = 'mau-qa-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 3 from public.candidates where slug = 'mau-qa-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-pm-ba-1', true, 'Chị Họp Tám Tiếng', 'pm_ba', 'Họp 8 tiếng làm 2 tiếng, xin job ít họp', 'Project Manager', 8, array['Scrum', 'Jira', 'Stakeholder']::text[],
  40, 70, false, 'TP.HCM', array['hybrid']::text[],
  null, '{"skin":4,"shirt":2,"pants":3,"hat":"beanie","bowl":"box"}'::jsonb,
  now() - interval '37 days', now() - interval '38 days', 16, 27)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 1, 0 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 6 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 7 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 0 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 2, 4 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 3, 1 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 1, 3 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 3 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 3 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 4, 0 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 2, 0 from public.candidates where slug = 'mau-pm-ba-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-pm-ba-2', true, 'Anh User Story', 'pm_ba', 'Viết user story rõ, khách đổi ý còn rõ hơn', 'Business Analyst', 5, array['BPMN', 'SQL', 'Figma']::text[],
  null, null, true, 'Hà Nội', array['hybrid', 'onsite']::text[],
  'Chuyên phiên dịch từ tiếng khách sang tiếng dev.', '{"skin":4,"shirt":6,"pants":1,"hat":"beanie","bowl":"box"}'::jsonb,
  now() - interval '40 days', now() - interval '41 days', 6, 36)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 1, 1 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 5 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 7 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 0 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 4 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 3 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 4 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 5 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 7 from public.candidates where slug = 'mau-pm-ba-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-pm-ba-3', true, 'Cô Scope Mới', 'pm_ba', 'Deadline hôm qua, scope mới hôm nay, xin việc', 'Product Manager', 4, array['Roadmap', 'Analytics', 'Discovery']::text[],
  null, null, true, 'Hà Nội', array['remote']::text[],
  null, '{"skin":3,"shirt":7,"pants":0,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '4 days', now() - interval '5 days', 4, 11)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 3 from public.candidates where slug = 'mau-pm-ba-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 6 from public.candidates where slug = 'mau-pm-ba-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 4, 2 from public.candidates where slug = 'mau-pm-ba-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-pm-ba-4', true, 'Bạn Biết Nói Không', 'pm_ba', 'Biết nói không với khách, chưa biết nói với mẹ', 'Scrum Master', 3, array['Scrum', 'Kanban', 'Coaching']::text[],
  null, null, true, 'Đà Nẵng', array['hybrid']::text[],
  null, '{"skin":1,"shirt":1,"pants":3,"hat":"cap","bowl":"hat"}'::jsonb,
  now() - interval '40 days', now() - interval '41 days', 21, 35)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 7 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 4, 2 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 0 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 2, 4 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 4 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 2, 7 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 6 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 2, 0 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 5 from public.candidates where slug = 'mau-pm-ba-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-devops-1', true, 'Anh Pipeline Xanh', 'devops', 'CI xanh mà ví vẫn đỏ, xin job mới', 'DevOps Engineer', 5, array['Docker', 'Kubernetes', 'Terraform']::text[],
  35, 60, false, 'TP.HCM', array['remote', 'hybrid']::text[],
  null, '{"skin":3,"shirt":3,"pants":2,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '37 days', now() - interval '38 days', 10, 24)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 4 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 5 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 2, 3 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 6 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 4, 1 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 4 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 2, 0 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 2, 1 from public.candidates where slug = 'mau-devops-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-devops-2', true, 'Em Chạy Trên Máy Tui', 'devops', 'Docker chạy được trên máy tui, xin việc', 'Junior DevOps', 1, array['Docker', 'Linux', 'Bash']::text[],
  null, null, true, 'Hà Nội', array['onsite']::text[],
  null, '{"skin":1,"shirt":6,"pants":0,"hat":"non_la","bowl":"bowl"}'::jsonb,
  now() - interval '30 days', now() - interval '31 days', 22, 17)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 4, 0 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 4, 2 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 2, 0 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 3 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 0 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 2 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 3, 0 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 2, 7 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 0, 3 from public.candidates where slug = 'mau-devops-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-devops-3', true, 'Chị Ba Giờ Sáng', 'devops', 'Server sập lúc 3 giờ sáng vẫn dậy fix', 'SRE', 6, array['AWS', 'Prometheus', 'Go']::text[],
  null, null, true, 'TP.HCM', array['remote']::text[],
  'Báo thức duy nhất tui sợ là báo thức của PagerDuty.', '{"skin":4,"shirt":1,"pants":0,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '35 days', now() - interval '36 days', 20, 27)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 4, 0 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 2, 2 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 0, 6 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 2, 3 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 2, 0 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 0, 5 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 2, 2 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 3, 1 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 1, 4 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 4 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 1, 0 from public.candidates where slug = 'mau-devops-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-devops-4', true, 'Bạn Hóa Đơn Mây', 'devops', 'Cloud bill giảm 40%, lương chưa tăng', 'Cloud Engineer', 4, array['Azure', 'FinOps', 'Terraform']::text[],
  null, null, true, 'Đà Nẵng', array['hybrid']::text[],
  null, '{"skin":0,"shirt":1,"pants":0,"hat":"beanie","bowl":"box"}'::jsonb,
  now() - interval '24 days', now() - interval '25 days', 15, 28)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 3 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 7 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 0 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 0 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 4, 5 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 2 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 1 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 1, 3 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 1, 7 from public.candidates where slug = 'mau-devops-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-fresher-1', true, 'Em Mới Ra Trường', 'fresher', 'Mới ra trường, CV trắng, tinh thần đỏ lửa', 'Fresher Developer', 0, array['Java', 'Git', 'SQL']::text[],
  null, null, true, 'Hà Nội', array['onsite', 'hybrid']::text[],
  null, '{"skin":2,"shirt":0,"pants":3,"hat":"beanie","bowl":"bowl"}'::jsonb,
  now() - interval '4 days', now() - interval '5 days', 4, 0)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 1, 0 from public.candidates where slug = 'mau-fresher-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 0 from public.candidates where slug = 'mau-fresher-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-fresher-2', true, 'Bạn Hello World', 'fresher', 'Fresher thông thạo Hello World, xin ai chỉ thêm', 'Intern Developer', 0, array['Python', 'HTML', 'Git']::text[],
  null, null, true, 'TP.HCM', array['onsite']::text[],
  'Học nhanh, hỏi nhiều, rửa ly cũng được.', '{"skin":1,"shirt":4,"pants":2,"hat":"beanie","bowl":"bowl"}'::jsonb,
  now() - interval '7 days', now() - interval '8 days', 9, 8)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 3, 0 from public.candidates where slug = 'mau-fresher-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 3, 5 from public.candidates where slug = 'mau-fresher-2'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 3 from public.candidates where slug = 'mau-fresher-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-fresher-3', true, 'Em Trà Đá', 'fresher', 'Intern nhận trà đá và lời khen, xin cơ hội', 'Frontend Intern', 0, array['React', 'JavaScript', 'CSS']::text[],
  null, null, true, 'Huế', array['hybrid']::text[],
  null, '{"skin":2,"shirt":7,"pants":0,"hat":"none","bowl":"hat"}'::jsonb,
  now() - interval '17 days', now() - interval '18 days', 12, 28)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 1, 3 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 7 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 1 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 4, 7 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 8, 0, 5 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 2, 0 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 5 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 3, 0 from public.candidates where slug = 'mau-fresher-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-fresher-4', true, 'Bạn Google Bốn Năm', 'fresher', 'Học Google 4 năm đại học, giờ xin học có lương', 'Fresher Tester', 0, array['Testing', 'SQL', 'Excel']::text[],
  null, null, true, 'Cần Thơ', array['onsite', 'remote']::text[],
  null, '{"skin":2,"shirt":0,"pants":2,"hat":"cap","bowl":"bowl"}'::jsonb,
  now() - interval '7 days', now() - interval '8 days', 1, 21)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 6 from public.candidates where slug = 'mau-fresher-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 1, 3 from public.candidates where slug = 'mau-fresher-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 0, 5 from public.candidates where slug = 'mau-fresher-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 4 from public.candidates where slug = 'mau-fresher-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 3 from public.candidates where slug = 'mau-fresher-4'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-other-1', true, 'Cô Content Nghìn Chữ', 'other', 'Viết content nghìn chữ, đọc lại còn thấy hay', 'Content Writer', 3, array['SEO', 'Copywriting', 'Canva']::text[],
  12, 20, false, 'Hà Nội', array['remote']::text[],
  null, '{"skin":1,"shirt":5,"pants":0,"hat":"non_la","bowl":"box"}'::jsonb,
  now() - interval '22 days', now() - interval '23 days', 7, 37)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 6 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 3 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 0, 6 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 2, 3 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 3, 0 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 1 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 0, 2 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 0, 4 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 0, 7 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 12, 2, 2 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 3 from public.candidates where slug = 'mau-other-1'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-other-2', true, 'Anh Bán Giấc Mơ', 'other', 'Làm sale giỏi, bán được cả giấc mơ', 'Sales Executive', 5, array['B2B', 'CRM', 'Negotiation']::text[],
  null, null, true, 'TP.HCM', array['onsite']::text[],
  null, '{"skin":1,"shirt":6,"pants":0,"hat":"cap","bowl":"bowl"}'::jsonb,
  now() - interval '1 days', now() - interval '2 days', 0, 6)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 6 from public.candidates where slug = 'mau-other-2'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-other-3', true, 'Chị Cân Đối Sổ', 'other', 'Kế toán cân đối sổ, chưa cân đối đời', 'Kế toán tổng hợp', 6, array['Excel', 'MISA', 'Thuế']::text[],
  null, null, true, 'Đà Nẵng', array['onsite', 'hybrid']::text[],
  null, '{"skin":2,"shirt":3,"pants":1,"hat":"beanie","bowl":"hat"}'::jsonb,
  now() - interval '7 days', now() - interval '8 days', 8, 14)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 0, 0, 4 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 0, 2 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 2, 0 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 4, 3, 0 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 3, 2 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 0, 6 from public.candidates where slug = 'mau-other-3'
on conflict (candidate_id, day) do nothing;

insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)
values ('mau-other-4', true, 'Bạn Đa Năng', 'other', 'Đa năng: sửa máy in, cài Win, an ủi sếp', 'IT Support', 4, array['Windows', 'Network', 'Helpdesk']::text[],
  null, null, true, 'Hà Nội', array['onsite']::text[],
  'Câu cửa miệng: bạn thử khởi động lại chưa?', '{"skin":4,"shirt":4,"pants":1,"hat":"beanie","bowl":"hat"}'::jsonb,
  now() - interval '37 days', now() - interval '38 days', 22, 35)
on conflict (slug) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 1, 4, 0 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 2, 3, 7 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 3, 0, 5 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 5, 0, 6 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 6, 1, 7 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 7, 4, 0 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 9, 3, 0 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 10, 4, 0 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 11, 3, 4 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;
insert into public.candidate_daily (candidate_id, day, xu, love)
select id, private.vn_today() - 13, 0, 6 from public.candidates where slug = 'mau-other-4'
on conflict (candidate_id, day) do nothing;

commit;
