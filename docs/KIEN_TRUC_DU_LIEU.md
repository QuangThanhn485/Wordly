# Kiến trúc dữ liệu Wordly

## 1. Mục tiêu thiết kế

Schema mới được thiết kế cho cơ sở dữ liệu key-value đồng bộ như `localStorage`, đồng thời giữ đường mở rộng sang một kho key-value từ xa.

Các mục tiêu chính:

- Không lưu toàn bộ ứng dụng trong một JSON lớn vì mỗi thay đổi nhỏ sẽ phải ghi lại mọi dữ liệu.
- Không tạo một key cho từng từ vì số key và số lần gọi mạng sẽ tăng quá nhanh.
- Không duy trì nhiều index chứa cùng một thông tin như schema cũ.
- Đọc một chủ đề mà không phải parse toàn bộ kho từ vựng.
- Mỗi record có version, revision và thời điểm cập nhật để phục vụ backup, kiểm tra xung đột và đồng bộ sau này.
- Quan hệ thư mục/chủ đề được chuẩn hóa, không dùng cây JSON lồng nhau làm dữ liệu gốc.
- Mỗi từ có ID ổn định, không dùng nội dung `word` làm khóa định danh.

## 2. Quyết định kiến trúc

Wordly dùng mô hình **normalized catalog + aggregate theo chủ đề**:

1. Catalog lưu metadata và quan hệ của toàn bộ thư mục/chủ đề.
2. Mỗi chủ đề lưu danh sách từ trong một record riêng.
3. Session, thống kê lỗi, cài đặt và tập luyện tạm thời nằm ở các record miền riêng.
4. Mọi record đều được bọc trong một envelope chung.

Đây là điểm cân bằng giữa hai cực:

- Một key duy nhất: ít key nhưng lần ghi lớn và dễ xung đột.
- Một key cho từng entity nhỏ: truy vấn chi tiết tốt nhưng quá nhiều key và thao tác ghi.

Với `N` chủ đề, database dùng tối đa khoảng `7 + N` key đang hoạt động. Số lượng từ không làm tăng số key.

## 3. Namespace và danh sách key

Namespace hiện tại là `wordly:v3`.

| Key | Nội dung | Chiến lược ghi |
| --- | --- | --- |
| `wordly:v3:system:meta` | ID database và ngày khởi tạo | Chỉ ghi khi khởi tạo |
| `wordly:v3:vocabulary:catalog` | Thư mục, chủ đề, quan hệ và số từ | Ghi khi cây hoặc count đổi |
| `wordly:v3:vocabulary:topic:<topicId>` | Toàn bộ từ của một chủ đề | Chỉ ghi chủ đề đang đổi |
| `wordly:v3:training:sets` | Các tập từ tạm thời, ví dụ top lỗi | Ghi khi tạo lại tập luyện |
| `wordly:v3:training:sessions` | Session của bốn chế độ luyện tập | Ghi khi tiến độ luyện tập đổi |
| `wordly:v3:learning:mistakes` | Thống kê lỗi học tập | Ghi khi hoàn thành/cập nhật lỗi |
| `wordly:v3:preferences` | Theme, ngôn ngữ, chế độ xem, cài đặt flashcard và thời gian xem kết quả | Ghi khi cài đặt đổi |
| `wordly:v3:system:backup` | Thời điểm backup gần nhất | Ghi khi tạo/khôi phục backup |

`topicId` được `encodeURIComponent` trước khi ghép vào key. Tên hiển thị không nằm trong key nên có thể dùng tiếng Việt có dấu, khoảng trắng và đổi tên mà không phải di chuyển dữ liệu.

## 4. Envelope chung

Mỗi value trong database có cấu trúc:

```json
{
  "schemaVersion": 3,
  "revision": 4,
  "updatedAt": 1784371200000,
  "data": {}
}
```

Ý nghĩa:

- `schemaVersion`: phiên bản schema toàn ứng dụng.
- `revision`: tăng riêng trên record mỗi lần record đó được ghi.
- `updatedAt`: thời điểm cập nhật record theo Unix timestamp, đơn vị mili giây.
- `data`: payload của miền dữ liệu.

`revision` chỉ có ý nghĩa khi so sánh hai bản của **cùng một key**. Không so sánh revision giữa hai key khác nhau.

## 5. Vocabulary catalog

Catalog là nguồn dữ liệu chuẩn cho cấu trúc kho từ vựng:

```json
{
  "catalogVersion": 1,
  "rootId": "root",
  "nodesById": {
    "root": {
      "kind": "folder",
      "id": "root",
      "label": "Root",
      "parentId": null,
      "childIds": ["folder_backend"],
      "createdAt": 1784371200000,
      "updatedAt": 1784371200000
    },
    "folder_backend": {
      "kind": "folder",
      "id": "folder_backend",
      "label": "Backend và API",
      "parentId": "root",
      "childIds": ["topic_security"],
      "createdAt": 1784371200000,
      "updatedAt": 1784371200000
    },
    "topic_security": {
      "kind": "topic",
      "id": "topic_security",
      "label": "Bảo mật ứng dụng",
      "parentId": "folder_backend",
      "wordCount": 24,
      "createdAt": 1784371200000,
      "updatedAt": 1784371200000
    }
  }
}
```

Lý do dùng `nodesById`:

- Tìm node theo ID trong O(1) sau khi catalog đã được parse.
- Đổi tên không ảnh hưởng topic key.
- Di chuyển node chỉ thay `parentId` và `childIds`.
- Không cần `topic_index` và `topic_counts` riêng như schema cũ.
- UI vẫn có thể dựng lại `FolderNode` dạng cây tại biên hiển thị.

`childIds` giữ đúng thứ tự hiển thị giữa thư mục và chủ đề. `parentId` là index ngược giúp kiểm tra tính toàn vẹn và hỗ trợ truy vấn cha.

## 6. Dữ liệu của một chủ đề

Key ví dụ: `wordly:v3:vocabulary:topic:topic_security`.

Payload:

```json
{
  "topicId": "topic_security",
  "items": [
    {
      "id": "word_3e38cbb1",
      "word": "authentication",
      "type": "noun",
      "vnMeaning": "sự xác thực",
      "pronunciation": "/ɔːˌθentɪˈkeɪʃn/",
      "createdAt": 1784371200000,
      "updatedAt": 1784371200000
    }
  ],
  "createdAt": 1784371200000,
  "updatedAt": 1784371200000
}
```

Quy tắc:

- `id` là định danh của từ; sửa nội dung từ không làm đổi ID.
- `word` không phải khóa duy nhất. Một chủ đề có thể chứa hai mục có cùng nội dung nhưng metadata khác nhau.
- Dữ liệu import thiếu ID sẽ được cấp ID khi ghi lần đầu.
- Record chỉ chứa từ của đúng `topicId`.
- `wordCount` trong catalog phải bằng `items.length`.

## 7. Session, lỗi và cài đặt

### Session luyện tập

Bốn session được gom trong một record nhỏ:

```json
{
  "flashcardsReading": {},
  "flashcardsListening": {},
  "readWrite": {},
  "listenWrite": {}
}
```

Việc gom session tránh bốn quy ước key riêng và giúp backup/restore theo miền. Payload session vẫn có `topicId`; tên chủ đề chỉ là dữ liệu hiển thị dự phòng.

### Thống kê lỗi

Thống kê lỗi là map theo khóa logic:

```text
<topicId>:<wordId>:<trainingMode>
```

Record lỗi giữ `wordId`, nội dung từ tại thời điểm học, `topicId`, `topicLabel`, số lần lỗi và thời điểm lỗi gần nhất. Vì quan hệ dùng ID, hai mục có cùng nội dung từ không bị gộp nhầm và việc sửa chính tả của từ không tạo một định danh thống kê mới.

### Cài đặt

Các cài đặt người dùng nằm trong một payload:

```json
{
  "themeMode": "dark",
  "vocabularyViewMode": "tree",
  "flashcards": {
    "removeCorrectCards": true
  },
  "writeTraining": {
    "answerReviewDurationMs": 3000,
    "disableAutoAdvance": false
  }
}
```

Thêm cài đặt mới bằng field có default, không cần tạo thêm localStorage key.

## 8. Luồng ghi và tính nhất quán

`localStorage.setItem` là nguyên tử cho một key nhưng không hỗ trợ transaction nhiều key. Wordly dùng các nguyên tắc sau:

1. Chỉ ghi record thực sự thay đổi.
2. Ghi topic data trước, sau đó cập nhật `wordCount` trong catalog.
3. Khi đọc một topic, count của topic đó được tự đối chiếu; trước khi backup, toàn bộ count được đối chiếu một lần.
4. Xóa cây/catalog trước rồi dọn topic record; topic mồ côi không được đưa vào truy vấn.
5. Mọi lần ghi được đọc lại ngay để xác minh value đã lưu đúng.
6. Cache trong bộ nhớ chỉ được dùng khi chuỗi value trong localStorage chưa đổi, nên thay đổi từ tab khác vẫn được nhận biết.

Nếu bước cập nhật count thất bại do hết quota, topic data mới vẫn còn và tác vụ đồng bộ count ở lần tải sau sẽ sửa catalog. Không đảo thứ tự này vì mất count ít nguy hiểm hơn mất nội dung chủ đề.

## 9. Backup và restore

Backup v3 có định dạng:

```json
{
  "format": "wordly-key-value-backup",
  "schemaVersion": 3,
  "exportedAt": 1784371200000,
  "records": {
    "wordly:v3:system:meta": {},
    "wordly:v3:vocabulary:catalog": {}
  }
}
```

Quy trình restore:

1. Parse toàn bộ file.
2. Kiểm tra format và schema version.
3. Chỉ chấp nhận key thuộc namespace v3 đã biết.
4. Kiểm tra envelope và payload theo từng miền.
5. Kiểm tra catalog không có cycle, ID trùng, node mồ côi hoặc quan hệ cha/con sai.
6. Đối chiếu `wordCount` với số item trong topic record.
7. Chụp lại dữ liệu hiện tại.
8. Ghi snapshot mới và xác minh từng value.
9. Nếu có lỗi khi ghi, khôi phục snapshot trước đó.

Backup schema v2 không được import vào v3. Đây là chủ ý vì giai đoạn hiện tại cho phép bỏ dữ liệu thử nghiệm và tránh mang cấu trúc lỗi sang database mới.

### 9.1. Phạm vi và khả năng round-trip

File tạo tại màn hình `/data` chứa toàn bộ record thuộc schema Wordly v3: catalog, dữ liệu từng chủ đề, tập luyện tạm, phiên luyện tập, thống kê lỗi, preferences và metadata backup. Preferences gồm theme, chế độ xem vocabulary, cài đặt flashcard và ngôn ngữ giao diện. Token đăng nhập và key ngoài namespace Wordly không được đưa vào file backup.

Backup toàn phần giữ nguyên ID, revision, timestamp và quan hệ giữa các record. Test round-trip thực hiện đúng đường đi thực tế `object -> JSON -> object -> restore` và đối chiếu lại từng record. Restore lỗi trong lúc ghi sẽ quay lại snapshot trước thao tác.

Import/export tại `/vocabulary` là gói dữ liệu cục bộ, không thay thế backup toàn phần:

- Export chủ đề giữ nhãn, danh sách từ, word ID và timestamp; chủ đề rỗng vẫn xuất được.
- Export thư mục giữ toàn bộ cây con và luôn có một mảng dữ liệu cho từng chủ đề, kể cả mảng rỗng.
- Khi import, folder/topic ID được cấp mới để không xung đột với catalog hiện tại; word metadata được giữ.
- File format hiện tại thiếu payload của một chủ đề hoặc có item không hợp lệ sẽ bị từ chối toàn bộ, không nhập một phần.
- Việc ghi cây và các topic của một lần import dùng snapshot rollback; state giao diện chỉ đổi sau khi mọi record đã được ghi thành công.

Muốn phục hồi chính xác cả lịch sử học và session đang tham chiếu topic ID cũ phải dùng backup `/data`. Gói `/vocabulary` phù hợp để chuyển hoặc ghép nội dung từ vựng vào một catalog khác.

## 10. Chính sách khởi tạo schema v3

Nếu chưa có `wordly:v3:system:meta`, ứng dụng coi đây là lần khởi tạo schema mới:

- Xóa các key đời cũ có prefix `wordly_`.
- Xóa `themeMode` và `vocabulary_view_mode` đời cũ.
- Không xóa `accessToken`, `refreshToken`, `i18nextLng` hoặc key ngoài phạm vi dữ liệu Wordly.
- Tạo database ID mới.

Việc reset chỉ chạy một lần khi schema v3 chưa tồn tại.

## 11. Độ phức tạp truy vấn

| Tác vụ | Chi phí |
| --- | --- |
| Đọc một chủ đề | O(k), với `k` là số từ của chủ đề |
| Đọc count toàn bộ chủ đề | O(n), chỉ parse catalog |
| Tìm topic theo ID | O(1) sau khi catalog nằm trong cache |
| Dựng cây hiển thị | O(n), với `n` là tổng node |
| Sửa một từ | Ghi một topic record và catalog nếu count đổi |
| Đổi tên/di chuyển node | Chỉ ghi catalog |
| Backup | O(tổng dung lượng database) |

Không có thao tác sửa một chủ đề nào phải serialize toàn bộ kho từ vựng.

## 12. Quy tắc mở rộng schema

- Thêm field tương thích ngược: giữ schema v3, cung cấp default khi đọc.
- Đổi ý nghĩa field hoặc thay quan hệ: tăng version miền hoặc schema toàn cục.
- Không thay đổi payload trực tiếp trong component; thêm hàm vào lớp facade tương ứng.
- Không gọi `localStorage` ngoài `src/data/database.ts` cho dữ liệu nghiệp vụ.
- Không dùng tên hiển thị trong physical key.
- Không tạo index mới nếu có thể suy ra nhanh và an toàn từ catalog.
- Khi một topic vượt ngưỡng thực tế của localStorage, có thể nâng cấp thành chunk `topic:<id>:<page>` cùng một manifest topic. Chỉ thực hiện khi có số liệu kích thước thực tế.

## 13. Vị trí mã nguồn

- `src/data/database.ts`: namespace, envelope, cache, revision, backup/restore và reset schema cũ.
- `src/data/appStorage.ts`: facade cho preferences, session và backup metadata.
- `src/features/vocabulary/utils/storageUtils.ts`: catalog chuẩn hóa, topic data và chuyển đổi tree/catalog.
- `src/pages/DataManagementPage.tsx`: giao diện backup, restore và xóa dữ liệu.
- `src/data/database.test.ts`: test database và backup.
- `src/features/vocabulary/utils/storageUtils.test.ts`: test catalog, Unicode, count và ID từ.
