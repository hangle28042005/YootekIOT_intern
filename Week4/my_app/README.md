# Week 3 — CRUD với Prisma

API NestJS sử dụng PostgreSQL và Prisma, gồm User, Profile và Post.
User có tối đa một Profile và nhiều Post.

## Cài đặt và chạy

Chạy trong thư mục `Week3/my_app`:

```sh
npm install
```

Tạo file `.env` với thông tin PostgreSQL:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/week3?schema=public"
```

```sh
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
npm run start:dev
```

API mặc định chạy tại `http://localhost:3000`.

## API

Các resource `/users`, `/profiles`, `/posts` hỗ trợ POST, GET, PATCH và DELETE.
Dùng `GET /posts/user/:userId` để lấy bài viết của một User.

Để thử luồng CRUD, tạo User trước rồi tạo Profile/Post với userId vừa nhận.
Khi xóa User, cần xóa Profile và các Post liên quan trước.

## Kiểm tra

```sh
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Các test dùng Prisma mock. Xem [test/README.md](test/README.md) để biết phạm vi kiểm thử.
