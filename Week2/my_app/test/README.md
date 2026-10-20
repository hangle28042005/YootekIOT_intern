# Kiểm thử tuần 2

Chạy các lệnh trong thư mục `Week2/my_app` sau khi đã cài dependencies và sinh Prisma Client:

```sh
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

- Unit test kiểm tra controller, service CRUD, chuyển đổi lỗi Prisma và middleware ghi log.
- HTTP test dùng `AppModule`, controller, service, validation pipe và middleware thật; chỉ thay provider `PrismaService` bằng mock.
- Mỗi test tạo mock mới, không phụ thuộc dữ liệu có sẵn, ID cố định từ tuần 1 hoặc PostgreSQL đang chạy. Các bản ghi giả có đủ `id`, `name`, `email`, `age` và `createdAt` theo schema hiện tại.
- Không test nào kết nối hoặc ghi vào database thật. Các test này không xác nhận migration, ràng buộc hoặc khả năng lưu dữ liệu thực tế của PostgreSQL; những phần đó cần kiểm thử riêng trên database dành cho test.
- `test/helpers/prisma.mock.ts` chỉ được dùng bởi test, không được import vào code ứng dụng.

Kiểm tra kiểu dữ liệu mà không sinh file build:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.spec.json --noEmit --incremental false
```
