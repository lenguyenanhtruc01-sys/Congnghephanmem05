// File dữ liệu mẫu dùng chung cho Module Quản Lý Khách

const mockRenters = [
  { 
    id: "NT001", 
    name: "Nguyễn Văn An", 
    phone: "0901234567", 
    email: "vana@gmail.com", 
    status: "renting",       // 'renting': đang thuê, 'looking': đang tìm phòng, 'checked_out': đã trả phòng
    verified: true,          // true: đã xác thực, false: chưa xác thực
    room: "Phòng 101 - Nhà Trọ Xanh",
    joinedDate: "15/01/2026"
  },
  { 
    id: "NT002", 
    name: "Trần Thị Bi", 
    phone: "0912345678", 
    email: "thib@gmail.com", 
    status: "looking", 
    verified: false,
    room: "Chưa có",
    joinedDate: "02/03/2026"
  },
  { 
    id: "NT003", 
    name: "Lê Văn Ca", 
    phone: "0987654321", 
    email: "vanc@gmail.com", 
    status: "checked_out", 
    verified: true,
    room: "Phòng 203 - Trọ Cô Ba",
    joinedDate: "10/08/2025"
  },
  { 
    id: "NT004", 
    name: "Phạm Thị Di", 
    phone: "0933221144", 
    email: "thid@gmail.com", 
    status: "renting", 
    verified: true,
    room: "Phòng 102 - Nhà Trọ Xanh",
    joinedDate: "01/02/2026"
  },
  { 
    id: "NT005", 
    name: "Hoàng Văn Em", 
    phone: "0977889900", 
    email: "vane@gmail.com", 
    status: "looking", 
    verified: false,
    room: "Chưa có",
    joinedDate: "10/03/2026"
  }
];

const mockLandlords = [
  { 
    id: "CT001", 
    name: "Bác Năm Trọ", 
    phone: "0909001122", 
    email: "bacnam@gmail.com", 
    status: "active",         // 'active': đang hoạt động, 'paused': tạm ngưng, 'rented': đã cho thuê hết
    type: "type1",            // 'type1': ưu tiên chất lượng người thuê, 'type2': chỉ quan tâm thanh toán
    verified: true,
    totalRooms: 12,
    address: "123 Nguyễn Văn Huề, P.Thanh Khê, Đà Nẵng"
  },
  { 
    id: "CT002", 
    name: "Cô Ba Sài Gòn", 
    phone: "0918112233", 
    email: "coba@gmail.com", 
    status: "rented", 
    type: "type2", 
    verified: true,
    totalRooms: 8,
    address: "45/2 Trung Nghĩa, P.Thanh Khê, Đà Nẵng"
  },
  { 
    id: "CT003", 
    name: "Trọ Xanh Quản Lý", 
    phone: "0988776655", 
    email: "troxanh@gmail.com", 
    status: "paused", 
    type: "type1", 
    verified: false,
    totalRooms: 20,
    address: "490 Tôn Đức Thắng, P.Hòa Khánh, Đà Nẵng "
  }
];