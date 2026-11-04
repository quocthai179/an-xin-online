# Phố Xin Việc 3D

Con phố nơi dân IT ngồi vỉa hè xin việc cho vui: ứng viên cầm biển carton tự trào, HR đi dạo thả xu, thả 500k, bao trọn.
Xu và 500k đều là xu ảo, đây là trò chơi.

Spec: `.squad/REQUIREMENTS.md`, `.squad/DESIGN.md`, `.squad/adr/`. Developer notes and deviations: `.squad/NOTES-dev.md`.

## Chạy thử (demo mode, không cần backend)

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Không đặt biến môi trường Supabase thì app chạy ở chế độ demo: "database" nằm trong localStorage, các tab trình duyệt nói chuyện qua
BroadcastChannel, mỗi tab là một người dùng khác nhau.

Thử luồng đầy đủ bằng 2 tab:

1. Tab A: vào phố bằng vai **HR** (nhập tên công ty).
2. Tab B: vào phố bằng vai **Ứng viên**, bấm "Ra ngồi", điền biển và lưu.
3. Tab A: chọn khu của ứng viên, mở CV, bấm "Thả xu". Tab B nhận toast và nghe "leng keng".
4. Tab A: "Thả 500k" (có lời nhắn + liên hệ). Tab B: Hộp thư, "Nhận lời". Tab A: "Bao trọn". Tab B: "Chấp nhận" và hồ sơ chuyển sang **Đã được bao**.

`?as=<tên>` ép id demo cố định (hữu ích khi test). Nút "Đổi người (demo)" biến tab hiện tại thành người dùng khác.

## Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` | ESLint (cấm `dangerouslySetInnerHTML`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (lib thuần, parity SQL, DemoBackend) |
| `BASE_URL=http://localhost:3000 node e2e/demo-flow.cjs` | Kịch bản Playwright 2 tab (cần server đang chạy và `playwright` có sẵn) |

## Supabase (chưa nối ở phase này)

`supabase/migrations/0001_init.sql` đã sẵn sàng (chưa chạy thử trên Postgres thật). Hằng số trong `src/lib/rules.ts` và SQL được
kiểm bằng `tests/parity/sql-config.test.ts`. `SupabaseBackend` là việc của phase P8, xem `.env.example`.
