# Manual Test Plan — Evolution Simulator v3.0

> Thực hiện theo thứ tự. Mở Console (F12) để theo dõi lỗi.

---

## 0. Chuẩn bị

1. Mở game trong trình duyệt
2. Mở Console (F12) → tab Console
3. Nếu có lỗi JS đỏ → ghi lại và báo cáo
4. Một số test cần console command, nhập trực tiếp vào tab Console

### Console Commands hữu dụng

```js
DayNightSystem.setTimeOfDay(22)       // Nhảy đến đêm (22:00)
DayNightSystem.setTimeOfDay(8)        // Nhảy đến sáng (08:00)
DayNightSystem.getTimeString()         // Xem thời gian hiện tại
DayNightSystem.getDarkness()           // Mức tối (0=sáng, 1=đêm sâu)
GameState.setHunger(25)               // Set hunger = 25 (đói)
GameState.setHunger(0)                // Set hunger = 0 (starving)
GameState.setHunger(100)              // Set hunger = 100 (đầy)
GameState.addResource("resource.food", 50)  // Thêm 50 food
GameActions.startBuild("building.torch")     // Vào mode xây đuốc
GameActions.startBuild("building.campfire")  // Vào mode xây đống lửa
GameActions.startBuild("building.bridge")    // Vào mode xây cầu
GameActions.startBuild("building.well")      // Vào mode xây giếng
```

---

## 1. Vòng tròn phạm vi công trình (Range Indicator)

### 1.1 Range circle cơ bản

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây Wood Cutter (10 Wood) | Công trình xuất hiện trên map | |
| 2 | Click vào Wood Cutter | Inspector hiện bên phải + vòng tròn **xanh lá** quanh công trình | |
| 3 | Kiểm tra Inspector | Có dòng "📡 Harvest: 5" (searchRadius cấp 1) | |
| 4 | Click vào vùng trống | Inspector đóng, vòng tròn biến mất | |
| 5 | Click lại Wood Cutter | Vòng tròn xuất hiện lại | |

### 1.2 Range circle — Warehouse

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây Warehouse (40W, 30S) | Công trình xuất hiện | |
| 2 | Click vào Warehouse | Vòng tròn **xanh dương** (transferRange=5) hiện | |
| 3 | Kiểm tra Inspector | Có dòng "📡 Transfer: 5" | |

### 1.3 Range circle — Upgrade

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Nâng cấp Wood Cutter lên Lv.2 | Vòng tròn xanh lá phình to (searchRadius=8) | |
| 2 | Kiểm tra Inspector | Hiện "Lv.2" và "Harvest: 8" | |

### 1.4 Range circle — Xóa công trình

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Click Wood Cutter, chọn Delete, confirm | Công trình bị xóa, vòng tròn biến mất | |
| 2 | Click vùng trống | Không có vòng tròn nào | |

---

## 2. Cơ chế đói (Hunger System)

### 2.1 Thanh Hunger cơ bản

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Mở game mới | Thanh Hunger **vàng** hiện dưới thanh HP, hiển thị "100 / 100" | |
| 2 | Chờ ~10 tick (~10s) | Hunger giảm từ 100 xuống ~95 | |
| 3 | Kiểm tra Console | Không có lỗi liên quan đến hunger | |

### 2.2 Auto-eat

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameState.setHunger(31)` | Hiển thị "31 / 100" | |
| 2 | Chờ 2 tick | Hunger giảm xuống dưới 30 | |
| 3 | Có Food trong resource | Game tự ăn 1 Food, Hunger +25, hiện floating text | |
| 4 | Kiểm tra resource bar | Food giảm 1, Hunger tăng lên ~55 | |

### 2.3 Đi chậm khi đói

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameState.setHunger(20)` | Hunger = 20 | |
| 2 | Di chuyển (WASD) | Tốc độ di chuyển **chậm rõ rệt** (50%) | |
| 3 | Kiểm tra ATK stat | Hiện "ATK: X (Slow!)" | |
| 4 | Console: `GameState.setHunger(80)` | Di chuyển bình thường trở lại | |

### 2.4 Starving — mất HP

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameState.setHunger(0)` | Hunger = 0, thanh **đỏ nhấp nháy** | |
| 2 | Kiểm tra không có Food | HP giảm 1/tick | |
| 3 | Thêm Food: `GameState.addResource("resource.food", 5)` | Game tự ăn, Hunger phục hồi lên 25 | |
| 4 | HP không còn giảm | HP dừng giảm sau Hunger > 0 | |

### 2.5 HP regen bị vô hiệu khi starving

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameState.setHunger(0)` | Starving | |
| 2 | Cho player bị thương (combat hoặc set HP) | HP **không regen** sau 3 giây không combat | |
| 3 | `GameState.setHunger(60)` | HP bắt đầu regen trở lại (1 HP/2s) | |

---

## 3. Ngày/Đêm (Day/Night Cycle)

### 3.1 Clock hiển thị

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Mở game mới | Clock hiện "☀ 12:00" ở góc trên phải | |
| 2 | Chờ ~15-20 giây | Clock thay đổi (ví dụ: ☀ 12:15) | |

### 3.2 Hoàng hôn

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `DayNightSystem.setTimeOfDay(17.5)` | Trời cam/đỏ, sương mù bắt đầu gần lại | |
| 2 | Kiểm tra Clock | Hiển thị "🌅 17:30" hoặc "☀ 17:30" | |

### 3.3 Ban đêm (tối)

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `DayNightSystem.setTimeOfDay(22)` | Trời **rất tối**, sương mù gần, khó nhìn xa | |
| 2 | Kiểm tra Clock | Hiển thị "🌙 22:00" | |
| 3 | Di chuyển gần player | Thấy character và vùng xung quanh (player light) | |
| 4 | Kiểm tra Console: `DayNightSystem.getDarkness()` | Trả về giá trị gần 1.0 | |

### 3.4 Bình minh

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `DayNightSystem.setTimeOfDay(6)` | Trời bắt đầu sáng, cam nhạt | |
| 2 | Console: `DayNightSystem.setTimeOfDay(8)` | Trời sáng bình thường, xanh | |

### 3.5 Tốc độ game speed

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameScene.setGameSpeed(5)` | Ngày đêm chạy nhanh 5x | |
| 2 | Console: `GameScene.setGameSpeed(0.5)` | Ngày đêm chạy chậm | |
| 3 | Console: `GameScene.setGameSpeed(1)` | Tốc độ bình thường | |

### 3.6 Lưu/Load thời gian

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Set thời gian: `DayNightSystem.setTimeOfDay(22)` | Đêm | |
| 2 | Refresh page (F5) | Game load lại, thời gian tiếp tục từ lúc save (~22:00) | |

---

## 4. Lửa/Đuốc (Fire System)

### 4.1 Xây đuốc

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Đảm bảo đang ban đêm: `DayNightSystem.setTimeOfDay(22)` | Tối | |
| 2 | Mở Build tab, tìm "Đuốc" | Hiện tat "Đuốc" với giá 5 Wood + 2 Flint | |
| 3 | Click Đuốc → đặt trên map | Đuốc xuất hiện với ngọn lửa cam | |
| 4 | Đến gần đuốc | Ánh sáng **cam ấm** chiếu quanh ~6 tiles | |
| 5 | Ra xa đuốc | Bị tối lại (ngoài bán kính sáng) | |

### 4.2 Xây đống lửa

| # | Hành động | Kết produto mong đợi | Pass? |
|---|-----------|----------------------|-------|
| 1 | Xây Đống lửa (15 Wood) | Đống lửa lớn hơn đuốc, lửa cam + đỏ | |
| 2 | Khoảng cách sáng | Ánh sáng rộng hơn đuốc (~12 tiles) | |

### 4.3 Fuel — kiểm tra drain

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Click đuốc → Inspector | Hiện "🔥 Fuel: 40/40 (100%)" | |
| 2 | Chờ ban đêm chạy | Fuel giảm dần (1/tick) | |
| 3 | Set sang ngày: `DayNightSystem.setTimeOfDay(12)` | Fuel **không giảm** (chỉ drain ban đêm) | |
| 4 | Set lại đêm: `DayNightSystem.setTimeOfDay(22)` | Fuel tiếp tục giảm | |

### 4.4 Refuel

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Đợi Fuel giảm xuống thấp | thanh Fuel màu đỏ/cam | |
| 2 | Click đuốc → Inspector → nút "Refuel" | Cần 3 Wood | |
| 3 | Click Refuel (đủ Wood) | Fuel +40, nút disabled hoặc hiển thị full | |
| 4 | Không đủ Wood | Nút "Refuel" bị disabled/xám | |

### 4.5 Fuel hết

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Console: `GameState.setFireFuel("inst_X", 0)` (thay X bằng uid) | Ánh sáng đuốc **tắt** | |
| 2 | Nạp lại Fuel | Ánh sáng bật lại | |

### 4.6 Phá đuốc/đống lửa

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Click đuốc → Delete → confirm | Đuốc biến mất, ánh sáng tắt | |

---

## 5. Nước (Water System)

### 5.1 Tạo nước trên map

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Di chuyển theo hướng X hoặc Z (đi xa) | Thấy dòng sông (nước xanh) ở xa home | |
| 2 | Nhìn kỹ | Nước sâu (đậm) ở giữa, nước nông (nhạt) ở viền | |
| 3 | Di chuyển xa hơn (>16 tiles) | Có thể thấy hồ nhỏ | |

### 5.2 Nước sâu — chặn di chuyển

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Thử đi vào nước sâu (dark blue) | **Không thể đi qua**, character bị block | |
| 2 | Thử xây Wood Cutter trên nước sâu | **Không thể xây**, preview đỏ | |

### 5.3 Nước nông — đi chậm

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Đi vào nước nông (light blue) | Character **đi được** nhưng chậm (50% speed) | |
| 2 | Ra khỏi nước | Tốc độ bình thường trở lại | |

### 5.4 Xây cầu (Bridge)

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Mở Build → chọn "Cầu" (15W + 5S) | Preview hiện | |
| 2 | Di chuyển preview đến **đất** | Preview **đỏ** (Cầu chỉ xây trên nước) | |
| 3 | Di chuyển preview đến **nước** | Preview **xanh** (valid) | |
| 4 | Click để xây cầu trên nước | Cầu xuất hiện trên tile nước | |
| 5 | Đi qua cầu | Di chuyển bình thường, không bị chậm | |
| 6 | Kiểm tra tile nước | Tile có cầu biến thành walkable | |

### 5.5 Xây giếng (Well)

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây Giếng nước (10 Stone + 5 Wood) | Giếng xuất hiện trên map | |
| 2 | Kiểm tra resource bar | Food tăng +1/tick (passive production) | |
| 3 | Click giếng → Inspector | Không có Harvest range, không có workers | |

### 5.6 Phá cầu

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Click cầu → Delete | Cầu bị xóa, tile nước trở lại không đi được | |
| 2 | Thử đi vào vị trí cầu cũ | Bị block (nước sâu) hoặc đi chậm (nước nông) | |

---

## 6. Mini Map + Sương mù (Fog of War)

### 6.1 Minimap cơ bản

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Mở game mới | Minimap 116x116px hiện góc dưới phải | |
| 2 | Chỉ thấy quanh player | Vùng xanh (đã khám phá) + vùng đen (chưa khám phá) | |
| 3 | Chấm trắng ở giữa | Vị trí player | |
| 4 | Chấm đỏ nhỏ | Vị trí công trình | |
| 5 | Click vào minimap | Minimap **phóng to** (300x300px) | |
| 6 | Click lần nữa | Minimap **thu nhỏ** về 116x116px | |

### 6.2 Fog of War

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Di chuyển sang chunk mới | Chunk mới hiện màu xanh trên minimap (đã khám phá) | |
| 2 | Xa hơn nữa | Nhiều vùng đen (chưa khám phá) | |
| 3 | Quay lại vùng đã khám phá | Vẫn thấy nội dung (cây, đá, ...) | |

### 6.3 Nước trên minimap

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Đi đến gần sông | Thấy màu **xanh nước** trên minimap | |
| 2 | Click minimap để phóng to | Thấy rõ sông/hồ trên map | |

### 6.4 Công trình trên minimap

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây công trình | Chấm đỏ hiện trên minimap tại vị trí xây | |

---

## 7. Lưu/Load toàn diện

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây đuốc + cầu + giếng | Công trình hiện trên map | |
| 2 | Set hunger = 50, thời gian = đêm | Các state đã thay đổi | |
| 3 | Refresh page (F5) | Game load lại | |
| 4 | Kiểm tra Hunger | Giữ nguyên (50) | |
| 5 | Kiểm tra thời gian | Tiếp tục từ điểm đã save | |
| 6 | Kiểm tra công trình | Đuốc, cầu, giếng vẫn ở vị trí cũ | |
| 7 | Chờ đến đêm | Ánh sáng đuốc hoạt động | |
| 8 | Kiểm tra minimap | Vùng đã khám phá vẫn hiện | |

---

## 8. Tương tác giữa các tính năng

### 8.1 Đói + Đêm tối

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Set: `DayNightSystem.setTimeOfDay(22)`, `GameState.setHunger(20)` | Tối + đói | |
| 2 | Di chuyển | Chậm (đói 50% speed) | |
| 3 | Có Food trong resource | Tự ăn, bắt đầu sáng hơn khi đi qua đuốc | |
| 4 | `GameState.setHunger(0)` | Starving + tối, HP giảm | |

### 8.2 Đói + Nước nông

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Set: `GameState.setHunger(20)` | Đói, đi chậm | |
| 2 | Đi vào nước nông | Cộng hưởng: chậm hơn nữa (50% speed × 50% water = 25% total) | |

### 8.3 Đuốc + đêm + cầu

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Set đêm: `DayNightSystem.setTimeOfDay(22)` | Tối | |
| 2 | Xây đuốc gần cầu | Ánh sáng đuốc chiếu sáng cả cầu | |
| 3 | Đi qua cầu lúc đêm | Thấy đường đi nhờ ánh sáng đuốc | |

### 8.4 Minimap + ngày/đêm

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Set đêm: `DayNightSystem.setTimeOfDay(22)` | Trên minimap, vùng explored nhìn mờ hơn (nếu có fog tối) | |

---

## 9. Edge Cases

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Xây đuốc ban ngày | Ánh sáng không hiệu quả (intensity ≈ 0) | |
| 2 | Xây cầu không trên nước | **Không được**, thông báo lỗi | |
| 3 | Xây Wood Cutter trên nước sâu | **Không được**, vị trí không hợp lệ | |
| 4 | Phá cầu khi đang đứng trên nó | Player được đẩy ra vị trí gần đó | |
| 5 | Starving + không có Food | HP giảm liên tục đến khi chết (0 HP) | |
| 6 | Set speed = 5x | Ngày đêm + đói + fuel drain đều nhanh 5x | |
| 7 | Set speed = 0.25x | Mọi thứ chạy chậm | |
| 8 | Pause game | Production dừng, nhưng ngày đêm vẫn chạy (theo thiết kế) | |

---

## 10. Performance

| # | Hành động | Kết quả mong đợi | Pass? |
|---|-----------|-------------------|-------|
| 1 | Di chuyển ra xa 5+ chunks | FPS vẫn ổn (>30) | |
| 2 | Xây 5+ đuốc lúc đêm | FPS ổn, không giật | |
| 3 | Speed 5x + nhiều công trình | FPS ổn | |

---

## Kết quả

- Nếu TẤT CẢ test Pass → v3.0 sẵn sàng
- Nếu CÓ test Fail → ghi chú lỗi, số test, và mô tả chi tiết

**Lưu ý cuối:** Nếu game crash hoặc có lỗi đỏ trong Console, copy toàn bộ lỗi và báo cáo.