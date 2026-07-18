# Wordly

Ứng dụng React và TypeScript để quản lý, nhập/xuất và luyện tập từ vựng tiếng Anh.

## Chức năng

- Quản lý thư mục, chủ đề và từ vựng.
- Nhập/xuất dữ liệu từ vựng và sao lưu/khôi phục toàn bộ dữ liệu.
- Bốn chế độ luyện tập: flashcard đọc, flashcard nghe, đọc và viết, nghe và viết.
- Thống kê lỗi theo chủ đề và chế độ luyện tập.
- Phát âm bằng Web Speech API.
- Giao diện sáng/tối và hỗ trợ tiếng Việt/tiếng Anh.

## Công nghệ

- React 19, TypeScript và React Router.
- Material UI, Emotion và Lucide.
- i18next.
- Create React App được cấu hình qua CRACO.
- Vercel Function tại `api/dictionary.ts` làm proxy cho dịch vụ từ điển.

## Lệnh phát triển

```bash
npm install
npm start
npm test -- --watchAll=false
npm run build
```

## Cấu trúc chính

```text
api/                    Vercel Functions
docs/                   Tài liệu kỹ thuật
src/app/                Khai báo route
src/data/               Lớp đọc/ghi dữ liệu tập trung
src/features/vocabulary Quản lý kho từ vựng
src/features/train/     Các chế độ luyện tập
src/features/result/    Tổng hợp kết quả
src/i18n/               Bản dịch
src/layouts/            Bố cục và thanh điều hướng
src/pages/              Các trang cấp ứng dụng
```

Kiến trúc dữ liệu, quy tắc backup/restore và các khóa lưu trữ được mô tả tại
[`docs/KIEN_TRUC_DU_LIEU.md`](docs/KIEN_TRUC_DU_LIEU.md).

## Triển khai

`vercel.json` cấu hình ứng dụng SPA và API proxy trên Vercel.
