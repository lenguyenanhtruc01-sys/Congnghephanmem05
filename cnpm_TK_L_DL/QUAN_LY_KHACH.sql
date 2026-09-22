-- ========================================================
-- MÔ TẢ: Khởi tạo bảng và dữ liệu mẫu cho Module Quản Lý Khách (T) 
-- ========================================================

-- 1. TẠO BẢNG CHỦ TRỌ (NGƯỜI CHO THUÊ)
CREATE TABLE ChuTro (
    id VARCHAR(10) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address NVARCHAR(255) NOT NULL,
    -- Trạng thái: 'active' (hoạt động), 'paused' (tạm ngưng), 'rented' (hết phòng)
    status VARCHAR(20) DEFAULT 'active',
    -- Phân loại: 'type1' (ưu tiên chất lượng), 'type2' (chỉ quan tâm thanh toán)
    landlord_type VARCHAR(10) DEFAULT 'type1',
    verified BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- 2. TẠO BẢNG PHÒNG TRỌ (LIÊN KẾT VỚI CHỦ TRỌ)
CREATE TABLE PhongTro (
    id VARCHAR(10) PRIMARY KEY,
    room_name NVARCHAR(100) NOT NULL,
    landlord_id VARCHAR(10),
    price DECIMAL(10, 2),
    FOREIGN KEY (landlord_id) REFERENCES ChuTro(id) ON DELETE SET NULL
);
GO

-- 3. TẠO BẢNG NGƯỜI THUÊ (LIÊN KẾT VỚI PHÒNG TRỌ)
CREATE TABLE NguoiThue (
    id VARCHAR(10) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    -- Trạng thái thuê: 'looking' (đang tìm), 'renting' (đang thuê), 'checked_out' (đã trả phòng)
    status VARCHAR(20) DEFAULT 'looking',
    verified BIT DEFAULT 0,
    room_id VARCHAR(10) NULL,
    joined_date DATE,
    FOREIGN KEY (room_id) REFERENCES PhongTro(id) ON DELETE SET NULL
);
GO

-- 4. NẠP DỮ LIỆU MẪU KHU VỰC ĐÀ NẴNG
-- Dữ liệu Chủ Trọ
INSERT INTO ChuTro (id, name, phone, email, address, status, landlord_type, verified) VALUES
('CT001', N'Bác Năm Trọ', '0909001122', 'bacnam@gmail.com', N'123 Nguyễn Văn Huề, P.Thanh Khê, Đà Nẵng', 'active', 'type1', 1),
('CT002', N'Cô Ba Sài Gòn', '0918112233', 'coba@gmail.com', N'45/2 Trung Nghĩa, P.Thanh Khê, Đà Nẵng', 'rented', 'type2', 1),
('CT003', N'Trọ Xanh Quản Lý', '0988776655', 'troxanh@gmail.com', N'490 Tôn Đức Thắng, P.Hòa Khánh, Đà Nẵng', 'paused', 'type1', 0);
GO

-- Dữ liệu Phòng Trọ
INSERT INTO PhongTro (id, room_name, landlord_id, price) VALUES
('P101', N'Phòng 101 - Nhà Trọ Xanh', 'CT003', 2500000),
('P102', N'Phòng 102 - Nhà Trọ Xanh', 'CT003', 2500000),
('P203', N'Phòng 203 - Trọ Cô Ba', 'CT002', 1800000);
GO

-- Dữ liệu Người Thuê
INSERT INTO NguoiThue (id, name, phone, email, status, verified, room_id, joined_date) VALUES
('NT001', N'Nguyễn Văn An', '0901234567', 'vana@gmail.com', 'renting', 1, 'P101', '2026-01-15'),
('NT002', N'Trần Thị Bi', '0912345678', 'thib@gmail.com', 'looking', 0, NULL, '2026-03-02'),
('NT003', N'Lê Văn Ca', '0987654321', 'vanc@gmail.com', 'checked_out', 1, 'P203', '2025-08-10'),
('NT004', N'Phạm Thị Di', '0933221144', 'thid@gmail.com', 'renting', 1, 'P102', '2026-02-01'),
('NT005', N'Hoàng Văn Em', '0977889900', 'vane@gmail.com', 'looking', 0, NULL, '2026-03-10');
GO