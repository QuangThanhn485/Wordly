# Lưu trữ Wordly trên Upstash Redis

## Mục tiêu

Wordly hỗ trợ hai nguồn dữ liệu:

- `localStorage`: dữ liệu nghiệp vụ nằm trên trình duyệt hiện tại.
- `upstash`: Upstash Redis là nguồn chính. localStorage chỉ giữ cache đã được kiểm tra để các API đồng bộ hiện tại của ứng dụng vẫn đọc nhanh và hoạt động ổn định.

Thông tin kết nối và mode chỉ được lưu trên thiết bị, không nằm trong backup và không được tải lên Redis.

## Quy tắc key

Wordly chỉ đọc và ghi một key Redis:

```text
wordly:storage:v1:snapshot
```

Mọi thao tác Redis có key đều đi qua hàm kiểm tra prefix `wordly:storage:v1:`. Source không gọi `SCAN`, `KEYS`, `FLUSHDB`, `FLUSHALL` hoặc `DEL` trên Redis. Vì vậy các key của MyFinance và dự án khác trong cùng database không nằm trong phạm vi thao tác của Wordly.

Snapshot chỉ chứa record nghiệp vụ có prefix schema:

```text
wordly:v3:
```

Các key cấu hình client sau không được đưa lên cloud:

```text
wordly:client:data-source:v1
wordly:client:cloud-meta:v1
```

## Cấu trúc snapshot

Snapshot gồm manifest và một backup Wordly schema v3:

```json
{
  "format": "wordly-cloud-snapshot",
  "snapshotVersion": 1,
  "manifest": {
    "schemaVersion": 1,
    "project": "wordly",
    "databaseNamespace": "wordly:v3",
    "revision": 1784630000000,
    "updatedAt": 1784630000000,
    "keyCount": 12,
    "checksum": "..."
  },
  "backup": {
    "format": "wordly-key-value-backup",
    "schemaVersion": 3,
    "exportedAt": 1784630000000,
    "records": {}
  }
}
```

Trước khi thay cache local, Wordly kiểm tra định dạng snapshot, project, namespace, schema của từng record, quan hệ catalog/topic, số record và checksum. Restore local có rollback: nếu một thao tác ghi thất bại, snapshot local trước đó được phục hồi.

## Luồng khởi động và chuyển nguồn

Khi mode là `upstash`, ứng dụng chưa render dữ liệu nghiệp vụ cho tới khi kiểm tra snapshot Redis:

1. Redis trống: tải snapshot local hiện tại lên.
2. Hai checksum giống nhau: mở ứng dụng.
3. Redis mới hơn và local không có ghi chưa đồng bộ: tải Redis về cache rồi reload.
4. Local có ghi chưa đồng bộ và Redis vẫn ở revision gốc: tiếp tục lần upload còn dang dở.
5. Cả local lẫn Redis cùng thay đổi: dừng và yêu cầu người dùng chọn phiên bản, không tự ghi đè.
6. Mạng hoặc credential lỗi: không sửa cache local; hiển thị lựa chọn thử lại hoặc chủ động chuyển về localStorage.

Nếu cache database local bị thiếu, metadata không hợp lệ hoặc một record local hỏng JSON/schema, Wordly vẫn kiểm tra Redis. Chỉ snapshot Redis hợp lệ mới được phép thay cache; Redis trống hoặc cũng hỏng thì thao tác dừng và không ghi nguồn nào. Database rỗng vừa được khởi tạo không được phép ghi đè snapshot cloud.

Khi chuyển từ cloud về localStorage, popup tải về chỉ xuất hiện nếu Redis mới hơn hoặc hai nguồn đã phân nhánh. Khi đang dùng cloud, Wordly không liên tục hỏi về chênh lệch với local cache.

## Chính sách ghi và chống spam API

Mọi mutation database được phát từ `src/data/database.ts`. `src/data/dataSource.ts` gom các mutation trong 2,2 giây và ghi toàn bộ dữ liệu bằng một lệnh compare-and-set nguyên tử (`EVAL`) trên snapshot. Revision phải khớp trước khi ghi nên một tab hoặc thiết bị khác không thể bị ghi đè âm thầm. Nếu dữ liệu local tiếp tục thay đổi khi request đang chạy, trạng thái `dirty` được giữ lại và một lượt đồng bộ kế tiếp được lên lịch.

Key `wordly:v3:training:sessions` là dữ liệu tiến trình tạm thời và bị loại khỏi snapshot/checksum cloud. Các lần lật card, chọn đáp án, nhập chữ, chuyển câu hoặc reload giữa bài chỉ cập nhật cache local, không đánh dấu cloud dirty và không gọi Redis. Khi bài học hoàn thành, các record kết quả như mistakes, history và task được ghi; chúng kích hoạt một lần đồng bộ đã gom. Session tạm vẫn ở thiết bị để tiếp tục bài học, được bảo toàn trong cùng transaction khi tải Redis về, nhưng không bao giờ được tải lên cloud.

Nếu upload lỗi, dữ liệu local và cờ `dirty` được giữ lại. Scheduler không tự lặp vô hạn; thay đổi tiếp theo phải chờ cooldown tăng dần từ 10 giây, tối đa 120 giây. Một lần đồng bộ thành công sẽ xóa cooldown. Lần mở tiếp theo không tự tải Redis đè lên thay đổi chưa đồng bộ.

Việc phân loại phiên bản còn đối chiếu checksum của hai nguồn với checksum đồng bộ gần nhất. Cơ chế này phục hồi đúng hướng ngay cả khi tab bị đóng hoặc metadata `dirty` chưa kịp lưu sau một thay đổi local.

### Ngân sách request dự kiến

| Tình huống | Request Redis |
| --- | ---: |
| Dùng thuần localStorage | 0 |
| Lưu cấu hình, Redis đã có snapshot | 1 `GET` |
| Lưu cấu hình, Redis trống | 1 `GET` + 1 `EVAL` |
| Khởi động cloud, hai nguồn giống nhau | 1 `GET` |
| Khởi động cloud, Redis mới hơn | 2 `GET` (so sánh và tải snapshot mới nhất) |
| Chuyển mode và chỉ cần so sánh | 1 `GET` |
| Một nhóm thêm/sửa/xóa nghiệp vụ | 1 `EVAL` sau debounce |
| Thao tác trong bài training | 0 |
| Hoàn thành bài training | 1 `EVAL` sau debounce |
| Conflict khi ghi | 1 `EVAL` + 1 `GET`, sau đó dừng |
| Refresh trạng thái thủ công | 1 `GET` |

Không có polling nền. Vì vậy thay đổi từ thiết bị khác được nhận ở lần mở trang tiếp theo, khi chuyển nguồn hoặc khi người dùng bấm kiểm tra; CAS vẫn chặn thiết bị hiện tại ghi đè nếu remote đã đổi trong lúc ứng dụng đang mở.

## Kiểm toán namespace của MyFinance

Source `D:\PROJECT\MyFinance` hiện dùng snapshot chính:

```text
myfinance:storage:snapshot
```

Các thao tác dọn dữ liệu cũ chỉ quét và xóa ba phạm vi:

```text
myfinance:storage:manifest
myfinance:storage:key:*
myfinance:storage:version:*
```

Không có lệnh xóa toàn database. Với code hiện tại, MyFinance không đọc, ghi hoặc xóa key Redis của Wordly hay dự án khác. Hàm dọn legacy chưa có assert prefix ở lớp thấp nhất, nhưng đầu vào của hàm chỉ được tạo từ ba hằng số namespace MyFinance nêu trên; đây là phòng tuyến hợp lệ, dù có thể bổ sung assert để tăng defense-in-depth trong một task riêng.

## File chịu trách nhiệm

- `src/data/database.ts`: schema, validation, rollback và sự kiện mutation.
- `src/data/dataSource.ts`: cấu hình nguồn, namespace Redis, snapshot, checksum, debounce và write-through.
- `src/data/DataSourceProvider.tsx`: bootstrap cloud, xử lý conflict và lỗi kết nối.
- `src/features/data/components/DataSourceSettings.tsx`: cấu hình và thao tác nguồn dữ liệu tại `/data`.
- `src/data/dataSource.test.ts`: kiểm tra namespace, chuyển nguồn nhiều vòng, local/remote cũ-mới, cache hỏng, race condition, rollback, cooldown, atomic CAS và chống spam khi training.
