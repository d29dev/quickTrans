# Quick Translate

Tiện ích mở rộng Chrome (Manifest V3) tra từ Anh → Việt và dịch đoạn văn ngay trong **Side Panel**.

Khi bạn bôi đen văn bản trên bất kỳ trang web nào, nội dung sẽ được gửi tới side panel để tra nghĩa từng từ (kèm phiên âm, từ loại, ví dụ) và dịch cả đoạn sang tiếng Việt.

## Tính năng

- **Tra từ điển Anh → Việt**: hiển thị phiên âm (UK/US), từ loại, nghĩa và ví dụ song ngữ.
- **Dịch đoạn văn**: gọi Google Translate không chính thức (`translate.googleapis.com`), tự động debounce 400ms khi gõ.
- **Tự động lấy văn bản đang bôi đen** từ trang hiện tại (debounce 400ms).
- **Hủy request cũ**: dùng `AbortController` + `requestId` để tránh kết quả cũ ghi đè kết quả mới.
- **Dark mode**: lưu lựa chọn trong `localStorage`.
- **Giao diện Material Design 3** (biến CSS trong `sidepanel.css`).
- **Mở side panel bằng phím tắt**: `Ctrl+Q` (Windows/Linux), `Command+Q` (macOS).

## Cấu trúc dự án

```
.
├── manifest.json        # Khai báo extension (MV3): permissions, side panel, content script, command
├── background.js        # Service worker: mở side panel khi nhấn phím tắt
├── content.js           # Bắt sự kiện bôi đen và gửi TEXT_SELECTED tới side panel
├── sidepanel.html       # Giao diện side panel
├── sidepanel.css        # Theme MD3, light/dark
├── sidepanel.js         # Logic tra từ + dịch + render
├── dictionary.js        # Tải từ điển, xây index, tra cứu / gợi ý
├── e2v.v1.min.json      # Từ điển Anh–Việt (~25 MB, bản local)
└── 48.png               # Icon extension
```

## Cài đặt

1. Clone hoặc tải thư mục dự án về máy.
2. Mở Chrome và truy cập `chrome://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và trỏ tới thư mục chứa `manifest.json`.

> Dự án không cần build, không cần `npm install`. Toàn bộ là HTML/CSS/JS thuần.

## Cách sử dụng

1. Bấm icon extension (hoặc nhấn `Ctrl+Q` / `Command+Q`) để mở side panel.
2. Chọn một trong hai cách:
   - Bôi đen đoạn văn trên trang web → nội dung tự động xuất hiện trong ô **Source Text**.
   - Gõ/dán trực tiếp vào ô **Source Text**.
3. Ô **Translation** hiển thị bản dịch; danh sách bên dưới hiển thị từng từ dạng accordion — bấm vào từ để xem chi tiết.

## Cách hoạt động

```
Trang web                Service worker            Side panel
─────────                ──────────────            ──────────
selectionchange
   │ (debounce 400ms)
   ├── chrome.runtime.sendMessage({type: "TEXT_SELECTED", text})
   │                              │
   │                              └──────────────► onMessage → handleInput()
   │                                                   │
   │                                    ┌──────────────┴──────────────┐
   │                                    ▼                             ▼
   │                            lookupWord() (local)          translate() (Google)
   │                                    │                             │
   │                                    ▼                             ▼
   │                            render accordion              output.value
```

- `dictionary.js` tải JSON một lần, xây `Map<word, entries[]>` (chuẩn hóa NFC + lowercase) rồi tái sử dụng cho các lần tra sau.
- `sidepanel.js` tách văn bản thành các từ duy nhất bằng `split(/[^\p{L}\p{N}_]+/u)`, tra từ điển và dịch song song.

## Định dạng từ điển

`e2v.v1.min.json` là một mảng các entry:

```json
[
  {
    "word": "'cellist",
    "pronunciations": [
      { "type": "UK", "text": "/ˈʧɛlɪst/" },
      { "type": "US", "text": "/'ˈʧɛləst/" }
    ],
    "translations": [
      {
        "type": "danh từ",
        "meanings": [
          {
            "content": "người chơi viôlôngxen, người chơi xelô",
            "examples": [
              { "english": "...", "vietnamese": "..." }
            ]
          }
        ]
      }
    ]
  }
]
```

Các trường `pronunciations`, `translations`, `type`, `examples` đều là tùy chọn — UI đã xử lý trường hợp thiếu dữ liệu.

## Ghi chú & giới hạn hiện tại

- **Nguồn từ điển**: `dictionary.js` đang ưu tiên URL CloudFront (`dd9olqht68i8r.cloudfront.net`). Biểu thức `"URL" || chrome.runtime.getURL(...)` khiến bản local `e2v.v1.min.json` không bao giờ được dùng; nếu muốn chạy offline, hãy đảo thứ tự hoặc bỏ URL.
- **Quyền host**: `manifest.json` chỉ khai báo `host_permissions` cho domain CloudFront. Nếu trình duyệt chặn request dịch, cần thêm `https://translate.googleapis.com/*`.
- **Phím tắt `Ctrl+Q`**: trên một số hệ điều hành, tổ hợp này trùng với phím tắt thoát trình duyệt. Có thể đổi trong `chrome://extensions/shortcuts`.
- **Bấm icon chưa mở panel**: `action` chưa có `default_popup` và chưa gọi `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, nên hiện tại chỉ phím tắt mở được panel.
- **API dịch không chính thức**: endpoint `translate.googleapis.com/translate_a/single` không phải API có cam kết, có thể thay đổi hoặc bị giới hạn bất cứ lúc nào.
- **Hiệu năng**: file từ điển ~25 MB được tải và parse toàn bộ ở lần tra đầu tiên; lần đầu có thể chậm tùy mạng.
