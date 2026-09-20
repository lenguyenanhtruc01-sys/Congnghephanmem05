(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const cfg = window.ROOMCONNECT_SUPABASE || {};

    let sb = null;
    let editingId = null;
    let toastTimer = null;
    let realtimeChannel = null;

    const state = {
        landlords: [],
        verifications: [],
        houses: [],
        rooms: [],
        posts: [],
        transactions: [],
        reviews: [],
        histories: []
    };

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizePhone(value) {
        return String(value ?? "").replace(/[^0-9+]/g, "");
    }

    function normalizeCccd(value) {
        return String(value ?? "").replace(/\D/g, "");
    }

    function formatDate(value) {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return escapeHtml(value);
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric"
        }).format(d);
    }

    function formatDateTime(value) {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return escapeHtml(value);
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        }).format(d);
    }

    function formatMoney(value) {
        const number = Number(value || 0);
        return new Intl.NumberFormat("vi-VN", {
            style: "currency", currency: "VND", maximumFractionDigits: 0
        }).format(number);
    }

    function getInitials(name) {
        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map(word => word.charAt(0))
            .join("")
            .toUpperCase();
    }

    function getDisplayStatus(landlord) {
        return landlord.trang_thai_tai_khoan === "Đã khóa"
            ? "Đã khóa"
            : landlord.trang_thai_hoat_dong;
    }

    function createBadge(text) {
        const safe = escapeHtml(text || "—");
        let className = "status-gray";

        if (["Đã xác thực", "Đang hoạt động", "Hoạt động", "Thành công", "Hoạt động"].includes(text)) {
            className = "status-active";
        } else if (["Chờ xác thực", "Đang xử lý"].includes(text)) {
            className = "status-pending";
        } else if (["Từ chối", "Đã khóa", "Ngừng hoạt động"].includes(text)) {
            className = "status-danger";
        }

        return `<span class="status ${className}">${safe}</span>`;
    }

    function setBanner(message, type = "info") {
        const el = $("connectionBanner");
        if (!el) return;
        el.textContent = message;
        el.className = `connection-banner show ${type}`;
    }

    function showToast(message, type = "info") {
        const el = $("toast");
        if (!el) return;
        clearTimeout(toastTimer);
        el.textContent = message;
        el.className = `toast show ${type}`;
        toastTimer = setTimeout(() => {
            el.className = `toast ${type}`;
        }, 2800);
    }

    function isConfigured() {
        return Boolean(
            cfg.url && cfg.key &&
            !cfg.url.includes("DAN_URL") &&
            !cfg.key.includes("DAN_PUBLISHABLE") &&
            /^https:\/\/.+\.supabase\.co\/?$/i.test(cfg.url.trim())
        );
    }

    function setLoadingRow(message = "Đang tải dữ liệu online...") {
        const body = $("landlordBody");
        if (body) body.innerHTML = `<tr><td colspan="8" class="loading-row">${escapeHtml(message)}</td></tr>`;
    }

    async function fetchTable(table, orderColumn = "id", ascending = true) {
        const query = sb.from(table).select("*").order(orderColumn, { ascending });
        const { data, error } = await query;
        if (error) throw new Error(`${table}: ${error.message}`);
        return data || [];
    }

    async function loadAllData({ silent = false } = {}) {
        if (!sb) return;
        if (!silent) setLoadingRow();

        try {
            const [
                landlords, verifications, houses, rooms,
                posts, transactions, reviews, histories
            ] = await Promise.all([
                fetchTable("nguoi_cho_thue", "ngay_tao", false),
                fetchTable("ho_so_xac_thuc", "id", true),
                fetchTable("nha_tro", "id", true),
                fetchTable("phong", "id", true),
                fetchTable("lich_su_dang_phong", "thoi_gian", false),
                fetchTable("giao_dich", "thoi_gian", false),
                fetchTable("danh_gia", "ngay_danh_gia", false),
                fetchTable("lich_su_xu_ly_tai_khoan", "thoi_gian", false)
            ]);

            Object.assign(state, {
                landlords, verifications, houses, rooms,
                posts, transactions, reviews, histories
            });

            render();
            setBanner("Đã kết nối Supabase. Dữ liệu trên trang đang được đọc và lưu trực tiếp trên mạng.", "success");
        } catch (error) {
            console.error(error);
            setBanner(`Không đọc được dữ liệu Supabase: ${error.message}`, "error");
            setLoadingRow("Không tải được dữ liệu. Kiểm tra cấu hình Supabase và chạy file supabase_setup.sql.");
        }
    }

    function housesOf(landlordId) {
        return state.houses.filter(item => Number(item.nguoi_cho_thue_id) === Number(landlordId));
    }

    function roomsOfHouse(houseId) {
        return state.rooms.filter(item => Number(item.nha_tro_id) === Number(houseId));
    }

    function roomOf(roomId) {
        return state.rooms.find(item => Number(item.id) === Number(roomId));
    }

    function houseCount(landlordId) {
        return housesOf(landlordId).length;
    }

    function roomCount(landlordId) {
        const ids = new Set(housesOf(landlordId).map(item => Number(item.id)));
        return state.rooms.filter(room => ids.has(Number(room.nha_tro_id))).length;
    }

    function render() {
        const keyword = ($("localSearch")?.value || "").toLowerCase().trim();
        const verify = $("verifyFilter")?.value || "";
        const status = $("statusFilter")?.value || "";

        const filtered = state.landlords.filter(landlord => {
            const searchText = [
                landlord.ho_ten,
                landlord.email,
                landlord.so_dien_thoai,
                landlord.cccd
            ].join(" ").toLowerCase();

            return (!keyword || searchText.includes(keyword)) &&
                (!verify || landlord.trang_thai_xac_thuc === verify) &&
                (!status || getDisplayStatus(landlord) === status);
        });

        $("statTotal").textContent = state.landlords.length;
        $("statVerified").textContent = state.landlords.filter(x => x.trang_thai_xac_thuc === "Đã xác thực").length;
        $("statPending").textContent = state.landlords.filter(x => x.trang_thai_xac_thuc === "Chờ xác thực").length;
        $("statLocked").textContent = state.landlords.filter(x => x.trang_thai_tai_khoan === "Đã khóa").length;

        const body = $("landlordBody");
        if (!body) return;

        if (!filtered.length) {
            body.innerHTML = `<tr><td colspan="8" class="empty">Không tìm thấy chủ trọ phù hợp.</td></tr>`;
            return;
        }

        body.innerHTML = filtered.map(landlord => `
            <tr>
                <td>
                    <div class="person">
                        <div class="person-avatar">${escapeHtml(getInitials(landlord.ho_ten))}</div>
                        <div>
                            <strong>${escapeHtml(landlord.ho_ten)}</strong>
                            <div class="muted">ID #${String(landlord.id).padStart(4, "0")}</div>
                        </div>
                    </div>
                </td>
                <td>
                    ${escapeHtml(landlord.so_dien_thoai)}
                    <div class="muted">${escapeHtml(landlord.email)}</div>
                </td>
                <td>${houseCount(landlord.id)}</td>
                <td>${roomCount(landlord.id)}</td>
                <td>${createBadge(landlord.trang_thai_xac_thuc)}</td>
                <td>${createBadge(getDisplayStatus(landlord))}</td>
                <td>${formatDate(landlord.ngay_tao)}</td>
                <td>
                    <div class="actions">
                        <button class="icon-btn" title="Xem chi tiết" onclick="openDetail(${Number(landlord.id)})">👁</button>
                        <button class="icon-btn" title="Sửa" onclick="openForm(${Number(landlord.id)})">✎</button>
                        <button class="icon-btn" title="Khóa / mở khóa" onclick="toggleLock(${Number(landlord.id)})">${landlord.trang_thai_tai_khoan === "Đã khóa" ? "🔓" : "🔒"}</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    function renderCell(cell) {
        if (cell && typeof cell === "object" && Object.hasOwn(cell, "badge")) {
            return createBadge(cell.badge);
        }
        if (cell && typeof cell === "object" && Object.hasOwn(cell, "html")) {
            return cell.html;
        }
        return escapeHtml(cell ?? "—");
    }

    function createTable(headers, rows) {
        if (!rows || rows.length === 0) {
            return `<div class="empty">Chưa có dữ liệu.</div>`;
        }

        return `
            <div class="table-wrapper">
                <table>
                    <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
                    <tbody>
                        ${rows.map(row => `<tr>${row.map(cell => `<td>${renderCell(cell)}</td>`).join("")}</tr>`).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.openDetail = function openDetail(id) {
        const landlord = state.landlords.find(item => Number(item.id) === Number(id));
        if (!landlord) return;

        const houses = housesOf(id);
        const verification = state.verifications.find(item => Number(item.nguoi_cho_thue_id) === Number(id));
        const posts = state.posts.filter(item => Number(item.nguoi_cho_thue_id) === Number(id));
        const transactions = state.transactions.filter(item => Number(item.nguoi_cho_thue_id) === Number(id));
        const reviews = state.reviews.filter(item => Number(item.nguoi_cho_thue_id) === Number(id));
        const histories = state.histories.filter(item => Number(item.nguoi_cho_thue_id) === Number(id));

        $("detailName").textContent = landlord.ho_ten;

        $("profile").innerHTML = `
            <div class="detail-kpis">
                <div class="mini-card"><small>Nhà trọ</small><strong>${houseCount(id)}</strong></div>
                <div class="mini-card"><small>Tổng phòng</small><strong>${roomCount(id)}</strong></div>
                <div class="mini-card"><small>Trạng thái</small><strong style="font-size:15px">${escapeHtml(getDisplayStatus(landlord))}</strong></div>
            </div>

            <div class="grid-2">
                <div class="field"><label>Họ và tên</label><div class="value">${escapeHtml(landlord.ho_ten)}</div></div>
                <div class="field"><label>Số điện thoại</label><div class="value">${escapeHtml(landlord.so_dien_thoai)}</div></div>
                <div class="field"><label>Email</label><div class="value">${escapeHtml(landlord.email)}</div></div>
                <div class="field"><label>CCCD</label><div class="value">${escapeHtml(landlord.cccd || "—")}</div></div>
                <div class="field full"><label>Địa chỉ</label><div class="value">${escapeHtml(landlord.dia_chi || "—")}</div></div>
                <div class="field"><label>Loại chủ trọ</label><div class="value">${escapeHtml(landlord.loai_chu_tro)}</div></div>
                <div class="field"><label>Ngày tham gia</label><div class="value">${formatDate(landlord.ngay_tao)}</div></div>
                <div class="field"><label>Trạng thái tài khoản</label><div class="value">${createBadge(landlord.trang_thai_tai_khoan)}</div></div>
            </div>

            <h3 style="margin:22px 0 12px;font-size:16px">Lịch sử xử lý tài khoản</h3>
            ${createTable(
                ["THỜI GIAN", "HÀNH ĐỘNG", "LÝ DO"],
                histories.map(item => [formatDateTime(item.thoi_gian), item.hanh_dong, item.ly_do || "—"])
            )}
        `;

        $("verify").innerHTML = `
            <div class="grid-2">
                <div class="field"><label>Trạng thái xác thực</label><div class="value">${createBadge(landlord.trang_thai_xac_thuc)}</div></div>
                <div class="field"><label>Ngày xác thực</label><div class="value">${formatDateTime(landlord.ngay_xac_thuc)}</div></div>
                <div class="field"><label>Ngày gửi hồ sơ</label><div class="value">${formatDateTime(verification?.ngay_gui)}</div></div>
                <div class="field"><label>Ngày xử lý</label><div class="value">${formatDateTime(verification?.ngay_xu_ly)}</div></div>
                <div class="field full"><label>Lý do từ chối</label><div class="value">${escapeHtml(verification?.ly_do_tu_choi || "—")}</div></div>
            </div>
        `;

        $("properties").innerHTML = createTable(
            ["NHÀ TRỌ", "ĐỊA CHỈ", "SỐ PHÒNG", "TRẠNG THÁI"],
            houses.map(house => [
                house.ten_nha_tro,
                house.dia_chi,
                roomsOfHouse(house.id).length,
                { badge: house.trang_thai }
            ])
        );

        $("posts").innerHTML = createTable(
            ["THỜI GIAN", "PHÒNG", "HÀNH ĐỘNG", "KẾT QUẢ"],
            posts.map(item => [
                formatDateTime(item.thoi_gian),
                roomOf(item.phong_id)?.ma_phong || "—",
                item.hanh_dong,
                { badge: item.ket_qua }
            ])
        );

        $("transactions").innerHTML = createTable(
            ["MÃ GD", "NGƯỜI THUÊ", "PHÒNG", "SỐ TIỀN", "THỜI GIAN", "TRẠNG THÁI"],
            transactions.map(item => [
                `GD${String(item.id).padStart(4, "0")}`,
                item.ten_nguoi_thue,
                roomOf(item.phong_id)?.ma_phong || "—",
                formatMoney(item.so_tien),
                formatDateTime(item.thoi_gian),
                { badge: item.trang_thai }
            ])
        );

        $("reviews").innerHTML = createTable(
            ["NGƯỜI THUÊ", "SỐ SAO", "NỘI DUNG", "NGÀY ĐÁNH GIÁ"],
            reviews.map(item => [
                item.ten_nguoi_thue,
                `${"★".repeat(Number(item.so_sao || 0))}${"☆".repeat(Math.max(0, 5 - Number(item.so_sao || 0)))}`,
                item.noi_dung,
                formatDateTime(item.ngay_danh_gia)
            ])
        );

        $("detailActions").innerHTML = `
            <button class="btn btn-light" onclick="openForm(${Number(id)}); closeModal('detailModal')">Sửa hồ sơ</button>
            ${landlord.trang_thai_xac_thuc !== "Đã xác thực" ? `<button class="btn btn-success" onclick="approveLandlord(${Number(id)})">Xác thực</button>` : ""}
            ${landlord.trang_thai_xac_thuc !== "Từ chối" ? `<button class="btn btn-warning" onclick="rejectLandlord(${Number(id)})">Từ chối xác thực</button>` : ""}
            <button class="btn ${landlord.trang_thai_tai_khoan === "Đã khóa" ? "btn-success" : "btn-danger"}" onclick="toggleLock(${Number(id)}, true)">
                ${landlord.trang_thai_tai_khoan === "Đã khóa" ? "Mở khóa" : "Khóa tài khoản"}
            </button>
            <button class="btn btn-danger" onclick="removeLandlord(${Number(id)})">Xóa hồ sơ</button>
        `;

        document.querySelectorAll(".tab").forEach((tab, index) => tab.classList.toggle("active", index === 0));
        document.querySelectorAll(".tab-panel").forEach((panel, index) => panel.classList.toggle("active", index === 0));
        $("detailModal").classList.add("show");
    };

    function clearFormErrors() {
        ["Name", "Phone", "Email", "Cccd", "Address"].forEach(name => {
            const err = $(`err${name}`);
            const input = $(`f${name}`);
            if (err) err.textContent = "";
            if (input) input.classList.remove("invalid");
        });
        const alert = $("formAlert");
        if (alert) {
            alert.textContent = "";
            alert.className = "form-alert error";
        }
    }

    function fieldError(field, message) {
        const input = $(`f${field}`);
        const err = $(`err${field}`);
        if (input) input.classList.add("invalid");
        if (err) err.textContent = message;
    }

    function formAlert(message, type = "error") {
        const el = $("formAlert");
        el.textContent = message;
        el.className = `form-alert show ${type}`;
    }

    window.openForm = function openForm(id = null) {
        editingId = id ? Number(id) : null;
        clearFormErrors();

        const landlord = editingId
            ? state.landlords.find(item => Number(item.id) === editingId)
            : null;

        $("formTitle").textContent = landlord ? "Sửa hồ sơ chủ trọ" : "Thêm chủ trọ";
        $("fName").value = landlord?.ho_ten || "";
        $("fPhone").value = landlord?.so_dien_thoai || "";
        $("fEmail").value = landlord?.email || "";
        $("fCccd").value = landlord?.cccd || "";
        $("fAddress").value = landlord?.dia_chi || "";
        $("fType").value = landlord?.loai_chu_tro || "Ưu tiên chất lượng người thuê";
        $("fActivity").value = landlord?.trang_thai_hoat_dong || "Đang hoạt động";
        $("fVerify").value = landlord?.trang_thai_xac_thuc || "Chờ xác thực";

        $("formModal").classList.add("show");
        setTimeout(() => $("fName").focus(), 50);
    };

    async function existsUnique(column, value, ignoreId = null) {
        if (!value) return false;
        let query = sb.from("nguoi_cho_thue").select("id").eq(column, value).limit(1);
        if (ignoreId) query = query.neq("id", ignoreId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).length > 0;
    }

    function validateForm(data) {
        let valid = true;
        clearFormErrors();

        if (data.ho_ten.length < 2) {
            fieldError("Name", "Vui lòng nhập họ và tên.");
            valid = false;
        }

        if (!/^0\d{9}$/.test(data.so_dien_thoai)) {
            fieldError("Phone", "Số điện thoại cần gồm 10 chữ số và bắt đầu bằng 0.");
            valid = false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            fieldError("Email", "Email chưa đúng định dạng.");
            valid = false;
        }

        if (data.cccd && !/^\d{12}$/.test(data.cccd)) {
            fieldError("Cccd", "CCCD cần gồm đúng 12 chữ số.");
            valid = false;
        }

        if (!valid) formAlert("M kiểm tra lại các trường được đánh dấu đỏ.");
        return valid;
    }

    function duplicateFieldFromError(error) {
        const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
        if (text.includes("email")) return ["Email", "Email này đã tồn tại trong hệ thống."];
        if (text.includes("so_dien_thoai") || text.includes("điện thoại")) return ["Phone", "Số điện thoại này đã tồn tại trong hệ thống."];
        if (text.includes("cccd")) return ["Cccd", "CCCD này đã tồn tại trong hệ thống."];
        return null;
    }

    async function submitLandlord(event) {
        event.preventDefault();
        if (!sb) {
            formAlert("Chưa cấu hình Supabase. Mở js/supabase-config.js và dán URL + key trước.");
            return;
        }

        const old = editingId
            ? state.landlords.find(item => Number(item.id) === Number(editingId))
            : null;

        const data = {
            ho_ten: $("fName").value.trim(),
            so_dien_thoai: normalizePhone($("fPhone").value),
            email: $("fEmail").value.trim().toLowerCase(),
            cccd: normalizeCccd($("fCccd").value) || null,
            dia_chi: $("fAddress").value.trim() || null,
            loai_chu_tro: $("fType").value,
            trang_thai_hoat_dong: $("fActivity").value,
            trang_thai_xac_thuc: $("fVerify").value,
            ngay_xac_thuc: $("fVerify").value === "Đã xác thực" ? (old?.ngay_xac_thuc || new Date().toISOString()) : null,
            ngay_cap_nhat: new Date().toISOString()
        };

        if (!validateForm(data)) return;

        const saveButton = $("saveButton");
        saveButton.disabled = true;
        const oldText = saveButton.textContent;
        saveButton.textContent = "Đang lưu...";

        try {
            const [emailExists, phoneExists, cccdExists] = await Promise.all([
                existsUnique("email", data.email, editingId),
                existsUnique("so_dien_thoai", data.so_dien_thoai, editingId),
                data.cccd ? existsUnique("cccd", data.cccd, editingId) : Promise.resolve(false)
            ]);

            let duplicate = false;
            if (emailExists) { fieldError("Email", "Email này đã tồn tại trong hệ thống."); duplicate = true; }
            if (phoneExists) { fieldError("Phone", "Số điện thoại này đã tồn tại trong hệ thống."); duplicate = true; }
            if (cccdExists) { fieldError("Cccd", "CCCD này đã tồn tại trong hệ thống."); duplicate = true; }

            if (duplicate) {
                formAlert("Không thể lưu vì có thông tin đã tồn tại. Lỗi được hiển thị ngay dưới trường tương ứng.");
                return;
            }

            let landlordId = editingId;

            if (editingId) {
                const { error } = await sb
                    .from("nguoi_cho_thue")
                    .update(data)
                    .eq("id", editingId);
                if (error) throw error;
            } else {
                const { data: inserted, error } = await sb
                    .from("nguoi_cho_thue")
                    .insert({
                        ...data,
                        trang_thai_tai_khoan: "Hoạt động"
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                landlordId = inserted.id;
            }

            const now = new Date().toISOString();
            const verificationPayload = {
                nguoi_cho_thue_id: landlordId,
                trang_thai: data.trang_thai_xac_thuc,
                ly_do_tu_choi: data.trang_thai_xac_thuc === "Từ chối" ? "Chưa nhập lý do chi tiết." : null,
                ngay_gui: now,
                ngay_xu_ly: data.trang_thai_xac_thuc === "Chờ xác thực" ? null : now
            };

            const { error: verificationError } = await sb
                .from("ho_so_xac_thuc")
                .upsert(verificationPayload, { onConflict: "nguoi_cho_thue_id" });
            if (verificationError) throw verificationError;

            await sb.from("lich_su_xu_ly_tai_khoan").insert({
                nguoi_cho_thue_id: landlordId,
                hanh_dong: editingId ? "Cập nhật hồ sơ" : "Tạo hồ sơ",
                ly_do: editingId ? "Cập nhật thông tin người cho thuê từ trang quản trị." : "Tạo mới người cho thuê từ trang quản trị."
            });

            await loadAllData({ silent: true });
            closeModal("formModal");
            showToast(editingId ? "Đã cập nhật hồ sơ trên Supabase." : "Đã thêm chủ trọ và lưu dữ liệu online.", "success");
        } catch (error) {
            console.error(error);
            const duplicateField = duplicateFieldFromError(error);
            if (error?.code === "23505" && duplicateField) {
                fieldError(duplicateField[0], duplicateField[1]);
                formAlert("Dữ liệu bị trùng. M xem dòng báo đỏ ngay dưới trường tương ứng.");
            } else {
                formAlert(`Không thể lưu dữ liệu: ${error.message || "Lỗi không xác định"}`);
            }
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = oldText;
        }
    }

    window.approveLandlord = async function approveLandlord(id) {
        if (!confirm("Xác thực người cho thuê này?")) return;
        const now = new Date().toISOString();
        try {
            const { error } = await sb.from("nguoi_cho_thue").update({
                trang_thai_xac_thuc: "Đã xác thực",
                ngay_xac_thuc: now,
                ngay_cap_nhat: now
            }).eq("id", id);
            if (error) throw error;

            const { error: verifyError } = await sb.from("ho_so_xac_thuc").upsert({
                nguoi_cho_thue_id: id,
                trang_thai: "Đã xác thực",
                ly_do_tu_choi: null,
                ngay_gui: now,
                ngay_xu_ly: now
            }, { onConflict: "nguoi_cho_thue_id" });
            if (verifyError) throw verifyError;

            await sb.from("lich_su_xu_ly_tai_khoan").insert({
                nguoi_cho_thue_id: id,
                hanh_dong: "Xác thực",
                ly_do: "Hồ sơ người cho thuê được xác thực."
            });

            await loadAllData({ silent: true });
            openDetail(id);
            showToast("Đã xác thực người cho thuê.", "success");
        } catch (error) {
            showToast(`Không thể xác thực: ${error.message}`, "error");
        }
    };

    window.rejectLandlord = async function rejectLandlord(id) {
        const reason = prompt("Nhập lý do từ chối xác thực:");
        if (reason === null) return;
        if (!reason.trim()) {
            showToast("Cần nhập lý do từ chối.", "error");
            return;
        }

        const now = new Date().toISOString();
        try {
            const { error } = await sb.from("nguoi_cho_thue").update({
                trang_thai_xac_thuc: "Từ chối",
                ngay_xac_thuc: null,
                ngay_cap_nhat: now
            }).eq("id", id);
            if (error) throw error;

            const { error: verifyError } = await sb.from("ho_so_xac_thuc").upsert({
                nguoi_cho_thue_id: id,
                trang_thai: "Từ chối",
                ly_do_tu_choi: reason.trim(),
                ngay_gui: now,
                ngay_xu_ly: now
            }, { onConflict: "nguoi_cho_thue_id" });
            if (verifyError) throw verifyError;

            await sb.from("lich_su_xu_ly_tai_khoan").insert({
                nguoi_cho_thue_id: id,
                hanh_dong: "Từ chối xác thực",
                ly_do: reason.trim()
            });

            await loadAllData({ silent: true });
            openDetail(id);
            showToast("Đã từ chối xác thực.", "success");
        } catch (error) {
            showToast(`Không thể cập nhật: ${error.message}`, "error");
        }
    };

    window.toggleLock = async function toggleLock(id, reopenDetail = false) {
        const landlord = state.landlords.find(item => Number(item.id) === Number(id));
        if (!landlord) return;

        const locked = landlord.trang_thai_tai_khoan === "Đã khóa";
        let reason = "";
        if (locked) {
            if (!confirm("Mở khóa tài khoản người cho thuê này?")) return;
            reason = "Mở khóa tài khoản theo thao tác quản trị.";
        } else {
            const entered = prompt("Nhập lý do khóa tài khoản:");
            if (entered === null) return;
            if (!entered.trim()) {
                showToast("Cần nhập lý do khóa tài khoản.", "error");
                return;
            }
            reason = entered.trim();
        }

        const newStatus = locked ? "Hoạt động" : "Đã khóa";
        try {
            const { error } = await sb.from("nguoi_cho_thue").update({
                trang_thai_tai_khoan: newStatus,
                ngay_cap_nhat: new Date().toISOString()
            }).eq("id", id);
            if (error) throw error;

            await sb.from("lich_su_xu_ly_tai_khoan").insert({
                nguoi_cho_thue_id: id,
                hanh_dong: locked ? "Mở khóa tài khoản" : "Khóa tài khoản",
                ly_do: reason
            });

            await loadAllData({ silent: true });
            if (reopenDetail) openDetail(id);
            showToast(locked ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.", "success");
        } catch (error) {
            showToast(`Không thể cập nhật tài khoản: ${error.message}`, "error");
        }
    };

    window.removeLandlord = async function removeLandlord(id) {
        if (!confirm("Xóa hồ sơ chủ trọ này? Các dữ liệu liên quan cũng sẽ bị xóa.")) return;
        try {
            const { error } = await sb.from("nguoi_cho_thue").delete().eq("id", id);
            if (error) throw error;
            closeModal("detailModal");
            await loadAllData({ silent: true });
            showToast("Đã xóa hồ sơ khỏi dữ liệu online.", "success");
        } catch (error) {
            showToast(`Không thể xóa: ${error.message}`, "error");
        }
    };

    window.closeModal = function closeModal(id) {
        $(id)?.classList.remove("show");
    };

    function attachEvents() {
        $("landlordForm")?.addEventListener("submit", submitLandlord);

        document.querySelectorAll(".tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
                document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
                tab.classList.add("active");
                $(tab.dataset.tab)?.classList.add("active");
            });
        });

        document.querySelectorAll(".modal").forEach(modal => {
            modal.addEventListener("click", event => {
                if (event.target === modal) modal.classList.remove("show");
            });
        });

        $("localSearch")?.addEventListener("input", () => {
            $("headerSearch").value = $("localSearch").value;
            render();
        });

        $("headerSearch")?.addEventListener("input", () => {
            $("localSearch").value = $("headerSearch").value;
            render();
        });

        $("verifyFilter")?.addEventListener("change", render);
        $("statusFilter")?.addEventListener("change", render);

        ["fName", "fPhone", "fEmail", "fCccd", "fAddress"].forEach(id => {
            $(id)?.addEventListener("input", () => {
                $(id).classList.remove("invalid");
                const map = { fName: "errName", fPhone: "errPhone", fEmail: "errEmail", fCccd: "errCccd", fAddress: "errAddress" };
                if ($(map[id])) $(map[id]).textContent = "";
            });
        });
    }

    function startRealtime() {
        if (!sb || realtimeChannel) return;
        realtimeChannel = sb
            .channel("roomconnect-online-sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "nguoi_cho_thue" }, () => loadAllData({ silent: true }))
            .on("postgres_changes", { event: "*", schema: "public", table: "nha_tro" }, () => loadAllData({ silent: true }))
            .on("postgres_changes", { event: "*", schema: "public", table: "phong" }, () => loadAllData({ silent: true }))
            .subscribe();
    }

    async function init() {
        attachEvents();

        if (!window.supabase) {
            setBanner("Không tải được thư viện Supabase JS. Kiểm tra kết nối Internet.", "error");
            setLoadingRow("Không tải được thư viện Supabase JS.");
            return;
        }

        if (!isConfigured()) {
            setBanner("Chưa cấu hình Supabase. Mở js/supabase-config.js rồi dán Project URL và Publishable/anon key.", "info");
            setLoadingRow("Chưa cấu hình dữ liệu online.");
            return;
        }

        sb = window.supabase.createClient(cfg.url.trim().replace(/\/$/, ""), cfg.key.trim());
        await loadAllData();
        startRealtime();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
