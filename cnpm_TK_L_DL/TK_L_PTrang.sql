-- ========================================================
--Tập hợp các truy vấn Tìm kiếm, Lọc và Phân trang
-- ========================================================

-----------------------------------------------------------
-- PHẦN A: TRUY VẤN DÀNH CHO "QUẢN LÝ NGƯỜI THUÊ"
-----------------------------------------------------------

-- 1. Truy vấn danh sách Người thuê kết hợp Tìm kiếm + Lọc + Phân trang
--    - SELECT: Các trường cần hiển thị
--    - LEFT JOIN: Lấy thêm tên phòng đang thuê (nếu có)
--    - WHERE: Tìm kiếm từ khóa và lọc theo trạng thái/xác thực
--    - ORDER BY & OFFSET...FETCH: Phân trang (Trang 1 lấy 3 dòng)
SELECT 
    nt.id AS ma_nguoi_thue,
    nt.name AS ho_ten,
    nt.phone AS so_dien_thoai,
    nt.email,
    nt.status AS trang_thai_thue,
    nt.verified AS da_xac_thuc,
    ISNULL(pt.room_name, N'Chưa có phòng') AS phong_hien_tai,
    nt.joined_date AS ngay_tham_gia
FROM NguoiThue nt
LEFT JOIN PhongTro pt ON nt.room_id = pt.id
WHERE 
    -- Tìm kiếm theo tên, số điện thoại hoặc email
    (nt.name LIKE N'%An%' OR nt.phone LIKE '%An%' OR nt.email LIKE '%An%')
    -- Lọc theo trạng thái thuê ('renting', 'looking', 'checked_out')
    AND nt.status = 'renting'
    -- Lọc theo trạng thái xác thực hồ sơ (1: Đã xác thực, 0: Chưa)
    AND nt.verified = 1
ORDER BY nt.id ASC
OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY;
GO

-- 2. Truy vấn đếm tổng số Người thuê (Dùng để tính tổng số trang)
SELECT COUNT(*) AS tong_so_nguoi_thue
FROM NguoiThue nt
WHERE 
    (nt.name LIKE N'%An%' OR nt.phone LIKE '%An%' OR nt.email LIKE '%An%')
    AND nt.status = 'renting'
    AND nt.verified = 1;
GO


-----------------------------------------------------------
-- PHẦN B: TRUY VẤN DÀNH CHO "QUẢN LÝ CHỦ TRỌ"
-----------------------------------------------------------

-- 1. Truy vấn danh sách Chủ trọ kết hợp Tìm kiếm + Lọc + Phân loại + Phân trang
--    - SELECT: Thông tin chủ trọ và COUNT tính tổng phòng sở hữu
--    - LEFT JOIN: Nối với bảng PhongTro để đếm số phòng
--    - WHERE: Tìm kiếm khu vực Đà Nẵng, lọc trạng thái và phân loại
--    - GROUP BY: Nhóm theo chủ trọ để dùng hàm COUNT
--    - OFFSET...FETCH: Phân trang
SELECT 
    ct.id AS ma_chu_tro,
    ct.name AS ten_chu_tro,
    ct.phone AS so_dien_thoai,
    ct.email,
    ct.address AS dia_chi_khu_tro,
    ct.status AS trang_thai_hoat_dong,
    ct.landlord_type AS phan_loai_chu_tro,
    ct.verified AS da_xac_thuc,
    COUNT(pt.id) AS tong_so_phong
FROM ChuTro ct
LEFT JOIN PhongTro pt ON ct.id = pt.landlord_id
WHERE 
    -- Tìm kiếm theo tên chủ trọ hoặc địa chỉ (Ví dụ: Thanh Khê, Hòa Khánh)
    (ct.name LIKE N'%Thanh Khê%' OR ct.address LIKE N'%Thanh Khê%')
    -- Lọc theo trạng thái hoạt động ('active', 'paused', 'rented')
    AND ct.status = 'active'
    -- Lọc theo phân loại chủ trọ ('type1': chất lượng, 'type2': thanh toán)
    AND ct.landlord_type = 'type1'
GROUP BY 
    ct.id, ct.name, ct.phone, ct.email, ct.address, ct.status, ct.landlord_type, ct.verified
ORDER BY ct.id ASC
OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY;
GO

-- 2. Truy vấn đếm tổng số Chủ trọ (Dùng để tính tổng số trang)
SELECT COUNT(*) AS tong_so_chu_tro
FROM ChuTro ct
WHERE 
    (ct.name LIKE N'%Thanh Khê%' OR ct.address LIKE N'%Thanh Khê%')
    AND ct.status = 'active'
    AND ct.landlord_type = 'type1';
GO