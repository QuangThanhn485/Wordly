# Kiến trúc phát âm tiếng Anh

## Mục tiêu

Wordly dùng một chuỗi phát âm miễn phí, không cần API key:

1. Ưu tiên bản ghi người thật từ Free Dictionary API.
2. Chọn giọng US hoặc UK theo `lang`.
3. Khi có IPA và loại từ, chỉ chọn bản ghi phù hợp với dữ liệu đó.
4. Nếu không có bản ghi, mạng lỗi hoặc trình duyệt chặn audio, tự động dùng Web Speech API.

Mọi màn hình gọi qua `src/utils/speechUtils.ts`; không tự gọi dịch vụ phát âm
riêng lẻ.

Người dùng có thể mở `Cài đặt` trên navbar để chọn:

- `Giọng mặc định`: dùng lại cơ chế Web Speech ban đầu của ứng dụng, không
  gọi API phát âm.
- `Bản ghi từ điển chuẩn`: dùng API và chọn giọng Anh-Mỹ hoặc Anh-Anh.

Cấu hình được lưu trong `AppPreferences.pronunciation` qua lớp dữ liệu tập
trung. Giá trị mặc định là bản ghi từ điển giọng Anh-Mỹ.

## Luồng production

- Frontend gọi `/api/pronunciation` cho một từ đơn.
- Vercel Function tra dữ liệu từ
  `https://api.dictionaryapi.dev/api/v2/entries/en/<word>`.
- `src/utils/pronunciationSource.ts` kiểm tra host audio, IPA, loại từ và
  giọng US/UK.
- Endpoint trả redirect `307` đến file audio. Redirect được cache ở trình
  duyệt và Vercel CDN để giảm số lần gọi nguồn ngoài.
- Nếu endpoint trả `404`, `502`, quá thời gian hoặc audio không phát được,
  frontend chuyển sang giọng Web Speech tốt nhất có trên thiết bị.

Trong development, frontend gọi trực tiếp Free Dictionary API vì CRA dev
server không chạy Vercel Function. API và file audio đều cho phép CORS.

## Chọn bản ghi an toàn

- Chỉ tra từ đơn, kể cả từ có dấu nháy hoặc gạch nối.
- Cụm từ và câu luôn dùng Web Speech API.
- Chỉ chấp nhận URL HTTPS từ các host audio đã cho phép.
- IPA được chuẩn hóa trước khi so khớp. Nếu IPA đã biết nhưng không có bản
  ghi đủ gần, hệ thống không dùng một bản ghi có khả năng sai.
- Loại từ giúp tránh dùng cách đọc của danh từ cho động từ khi từ điển tách
  chúng thành các mục khác nhau.

## Web Speech dự phòng

Giọng dự phòng được chấm điểm theo thứ tự:

- đúng locale yêu cầu (`en-US` hoặc `en-GB`);
- giọng có nhãn Natural, Neural, Premium hoặc Enhanced;
- các giọng chất lượng cao phổ biến của hệ điều hành/trình duyệt;
- loại trừ hoặc hạ điểm các giọng Compact, eSpeak, Festival và Novelty.

Tốc độ mặc định của giọng tổng hợp là `0.95` để rõ âm hơn. Bản ghi người thật
giữ tốc độ `1.0`.

## Chi phí và giới hạn

- Không có dependency phát âm mới.
- Không có API key, tài khoản cloud hay dịch vụ có thể phát sinh phí.
- Chất lượng cao nhất áp dụng cho từ có bản ghi. Từ hiếm, cụm từ và câu phụ
  thuộc vào giọng cài trên thiết bị.
- Cache giảm tải nhưng Free Dictionary API vẫn là dịch vụ cộng đồng; Web
  Speech là lớp dự phòng bắt buộc.

Nguồn kỹ thuật:

- Free Dictionary API: https://dictionaryapi.dev/
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Vercel CDN cache: https://vercel.com/docs/cdn-cache
