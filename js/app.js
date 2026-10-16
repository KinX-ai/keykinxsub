/**
 * KinXSub Admin License Center Controller
 * Full RSA-2048 signing with flexible duration (Days, Months, Years, Lifetime, Custom Calendar)
 * PIN Vault Security & Trial Claim Registry Management
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & Keys ---
    const STORAGE_KEY_PIN = 'kinxsub_admin_pin';
    const STORAGE_KEY_SESSION = 'kinxsub_admin_auth';
    const STORAGE_KEY_HISTORY = 'kinxsub_license_history';
    const STORAGE_KEY_TRIAL_REGISTRY = 'kinxsub_claimed_registry';
    const DEFAULT_PIN = '888888';

    // --- State Variables ---
    let currentDuration = 30; // default 30 days
    let currentPlan = 'VIP';
    let lastGeneratedKey = '';
    let lastGeneratedPayload = null;

    // --- Elements ---
    const lockModal = document.getElementById('lockModal');
    const pinInput = document.getElementById('pinInput');
    const btnUnlock = document.getElementById('btnUnlock');
    const lockError = document.getElementById('lockError');
    const btnLockApp = document.getElementById('btnLockApp');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const hwidInput = document.getElementById('hwidInput');
    const btnPasteHwid = document.getElementById('btnPasteHwid');
    const customerInput = document.getElementById('customerInput');
    const planBtns = document.querySelectorAll('.plan-btn');
    const btnGenerate = document.getElementById('btnGenerate');

    // Category duration pills & panes
    const categoryPills = document.querySelectorAll('.category-pill');
    const categoryPanes = document.querySelectorAll('.category-content-pane');
    const allDurationBtns = document.querySelectorAll('.duration-btn');
    const customDaysInput = document.getElementById('inputCustomDaysCount');
    const btnApplyCustomDays = document.getElementById('btnApplyCustomDays');
    const customDateInput = document.getElementById('customDateInput');

    // Results Elements
    const resultCard = document.getElementById('resultCard');
    const keyOutput = document.getElementById('keyOutput');
    const btnCopyKey = document.getElementById('btnCopyKey');
    const btnCopyMessage = document.getElementById('btnCopyMessage');
    const metaHwid = document.getElementById('metaHwid');
    const metaPlan = document.getElementById('metaPlan');
    const metaExpires = document.getElementById('metaExpires');
    const metaDays = document.getElementById('metaDays');
    const resultTimestamp = document.getElementById('resultTimestamp');

    // History Elements
    const historyTableBody = document.getElementById('historyTableBody');
    const historyEmpty = document.getElementById('historyEmpty');
    const historySearch = document.getElementById('historySearch');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const btnExportHistory = document.getElementById('btnExportHistory');

    // Trial Management Elements
    const trialTableBody = document.getElementById('trialTableBody');
    const trialEmpty = document.getElementById('trialEmpty');
    const trialSearch = document.getElementById('trialSearch');
    const btnClearTrials = document.getElementById('btnClearTrials');
    const btnExportTrials = document.getElementById('btnExportTrials');

    // Verify Elements
    const verifyKeyInput = document.getElementById('verifyKeyInput');
    const btnVerify = document.getElementById('btnVerify');
    const verifyResult = document.getElementById('verifyResult');

    // Settings Elements
    const oldPinInput = document.getElementById('oldPinInput');
    const newPinInput = document.getElementById('newPinInput');
    const btnChangePin = document.getElementById('btnChangePin');

    // --- 1. PIN Vault & Authentication ---
    function getStoredPin() {
        return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
    }

    function checkAuth() {
        const isAuth = sessionStorage.getItem(STORAGE_KEY_SESSION) === 'true';
        if (isAuth) {
            lockModal.classList.add('hidden');
        } else {
            lockModal.classList.remove('hidden');
            pinInput.value = '';
            lockError.style.display = 'none';
            setTimeout(() => pinInput.focus(), 100);
        }
    }

    function unlockApp() {
        const entered = pinInput.value.trim();
        if (entered === getStoredPin()) {
            sessionStorage.setItem(STORAGE_KEY_SESSION, 'true');
            lockModal.classList.add('hidden');
            showToast('Mở khóa phiên quản trị thành công!', 'success');
        } else {
            lockError.style.display = 'block';
            pinInput.select();
        }
    }

    btnUnlock.addEventListener('click', unlockApp);
    pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlockApp();
    });

    btnLockApp.addEventListener('click', () => {
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        checkAuth();
        showToast('Đã khóa bảo mật hệ thống!', 'info');
    });

    // --- 2. Tab Navigation ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                if (targetId === 'tabHistory') renderHistory();
                if (targetId === 'tabTrials') renderTrials();
            }
        });
    });

    // --- 3. HWID Formatting & Paste ---
    hwidInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        val = val.replace(/-/g, '');
        if (val.length > 2 && !val.startsWith('KX')) {
            val = 'KX' + val;
        }
        let formatted = '';
        for (let i = 0; i < val.length && i < 18; i++) {
            if (i === 2 || i === 6 || i === 10 || i === 14) formatted += '-';
            formatted += val[i];
        }
        e.target.value = formatted;
    });

    btnPasteHwid.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                hwidInput.value = text.trim().toUpperCase();
                hwidInput.dispatchEvent(new Event('input'));
                showToast('Đã dán mã máy từ Clipboard!', 'success');
            }
        } catch (err) {
            showToast('Không thể đọc Clipboard (Vui lòng bấm Ctrl+V)', 'error');
        }
    });

    // --- 4. Flexible Duration Selector (Ngày, Tháng, Năm, Vĩnh Viễn, Lịch) ---
    // Category tabs switching
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            categoryPanes.forEach(pane => pane.classList.remove('active'));

            pill.classList.add('active');
            const cat = pill.getAttribute('data-cat');

            if (cat === 'days') {
                document.getElementById('paneDurationDays').classList.add('active');
            } else if (cat === 'months') {
                document.getElementById('paneDurationMonths').classList.add('active');
            } else if (cat === 'years') {
                document.getElementById('paneDurationYears').classList.add('active');
            } else if (cat === 'lifetime') {
                document.getElementById('paneDurationLifetime').classList.add('active');
                currentDuration = 36500; // Lifetime = year 2099
            } else if (cat === 'custom') {
                document.getElementById('paneDurationCustom').classList.add('active');
                currentDuration = 'custom';
            }
        });
    });

    // Duration buttons inside panes
    allDurationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            allDurationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const days = btn.getAttribute('data-days');
            currentDuration = parseInt(days, 10);
            showToast(`Đã chọn thời hạn: ${currentDuration >= 36500 ? 'Vĩnh viễn' : currentDuration + ' ngày'}`);
        });
    });

    // Custom days count input
    if (btnApplyCustomDays) {
        btnApplyCustomDays.addEventListener('click', () => {
            const val = parseInt(customDaysInput.value, 10);
            if (!val || val <= 0) {
                showToast('Vui lòng nhập số ngày hợp lệ (> 0)!', 'error');
                return;
            }
            allDurationBtns.forEach(b => b.classList.remove('active'));
            currentDuration = val;
            showToast(`Đã áp dụng thời hạn tùy chỉnh: ${val} ngày!`, 'success');
        });
    }

    // Custom Calendar Date picker
    if (customDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        customDateInput.min = tomorrow.toISOString().split('T')[0];
        customDateInput.addEventListener('change', () => {
            currentDuration = 'custom';
        });
    }

    // Plan Selection
    planBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            planBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPlan = btn.getAttribute('data-plan');
        });
    });

    // --- 5. Generate Key Button ---
    btnGenerate.addEventListener('click', async () => {
        const hwid = hwidInput.value.trim().toUpperCase();
        const customer = customerInput.value.trim() || 'Khách Hàng VIP';

        if (!hwid || hwid.length < 10) {
            showToast('Vui lòng nhập đúng mã máy (VD: KX-A1B2-C3D4-E5F6-7890)', 'error');
            hwidInput.focus();
            return;
        }

        // Calculate Expiry Date
        let expiresAt = '';
        let daysCount = 30;

        if (currentDuration === 'custom') {
            const chosenDate = customDateInput.value;
            if (!chosenDate) {
                showToast('Vui lòng chọn ngày hết hạn trên lịch!', 'error');
                customDateInput.focus();
                return;
            }
            expiresAt = chosenDate;
            const targetTime = new Date(chosenDate).getTime();
            const nowTime = new Date().setHours(0, 0, 0, 0);
            daysCount = Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24));
        } else if (currentDuration >= 36500) {
            expiresAt = '2099-12-31';
            daysCount = 'Vĩnh Viễn';
        } else {
            daysCount = currentDuration;
            const exp = new Date();
            exp.setDate(exp.getDate() + currentDuration);
            expiresAt = exp.toISOString().split('T')[0];
        }

        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<span>⚡</span> Đang ký số RSA-2048...';

        try {
            const today = new Date().toISOString().split('T')[0];
            const payload = {
                app: 'KinXSub',
                hwid: hwid,
                issued: today,
                exp: expiresAt,
                type: currentDuration >= 36500 ? 'lifetime' : (currentPlan === 'TRIAL' ? 'trial' : 'standard'),
                plan: currentPlan,
                customer: customer
            };

            const token = await window.KinXCrypto.signLicensePayload(payload);

            lastGeneratedKey = token;
            lastGeneratedPayload = payload;

            // Render Output
            keyOutput.textContent = token;
            metaHwid.textContent = hwid;
            metaPlan.textContent = currentPlan;
            metaExpires.textContent = expiresAt;
            metaDays.textContent = typeof daysCount === 'number' ? `${daysCount} ngày` : daysCount;
            resultTimestamp.textContent = new Date().toLocaleTimeString('vi-VN');

            resultCard.classList.remove('hidden');
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Save History
            saveToHistory({
                token,
                hwid,
                customer,
                plan: currentPlan,
                expiresAt,
                days: daysCount,
                timestamp: new Date().toLocaleString('vi-VN')
            });

            showToast('Tạo mã bản quyền RSA-2048 thành công!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Lỗi khi ký số bản quyền: ' + err.message, 'error');
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = '<span>⚡</span> TẠO KEY BẢN QUYỀN (RSA-2048)';
        }
    });

    // --- 6. Clipboard Actions ---
    btnCopyKey.addEventListener('click', async () => {
        if (!lastGeneratedKey) return;
        try {
            await navigator.clipboard.writeText(lastGeneratedKey);
            showToast('Đã sao chép mã Key vào Clipboard!', 'success');
        } catch (err) {
            showToast('Không thể sao chép, vui lòng copy thủ công', 'error');
        }
    });

    btnCopyMessage.addEventListener('click', async () => {
        if (!lastGeneratedKey || !lastGeneratedPayload) return;

        const customer = lastGeneratedPayload.customer || 'Quý khách';
        const msg = [
            `🎉 CẢM ƠN BẠN ĐÃ MUA BẢN QUYỀN KINXSUB AI!`,
            `----------------------------------------`,
            `👤 Khách hàng: ${customer}`,
            `💻 Mã máy (HWID): ${lastGeneratedPayload.hwid}`,
            `⭐ Gói bản quyền: ${lastGeneratedPayload.plan}`,
            `📅 Hạn sử dụng: ${lastGeneratedPayload.exp}`,
            `----------------------------------------`,
            `🔑 MÃ KÍCH HOẠT (KEY BẢN QUYỀN):`,
            lastGeneratedKey,
            `----------------------------------------`,
            `📖 HƯỚNG DẪN KÍCH HOẠT:`,
            `1. Mở phần mềm KinXSub trên máy tính của bạn.`,
            `2. Chọn menu "Đăng ký bản quyền" ở góc trái.`,
            `3. Dán toàn bộ mã kích hoạt ở trên vào ô "Mã kích hoạt".`,
            `4. Nhấp nút "Kích hoạt ngay" để mở khóa toàn bộ tính năng VIP!`,
            `Chúc bạn sáng tạo ra nhiều video triệu view với KinXSub! 🚀`
        ].join('\n');

        try {
            await navigator.clipboard.writeText(msg);
            showToast('Đã sao chép tin nhắn gửi khách hoàn chỉnh!', 'success');
        } catch (err) {
            showToast('Không thể sao chép tin nhắn', 'error');
        }
    });

    // --- 7. History Tab Management ---
    function getHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(item) {
        const list = getHistory();
        list.unshift(item);
        if (list.length > 500) list.pop();
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    }

    function renderHistory(filter = '') {
        const list = getHistory();
        historyTableBody.innerHTML = '';

        const f = filter.toLowerCase().trim();
        const filtered = list.filter(item => {
            return (
                (item.customer && item.customer.toLowerCase().includes(f)) ||
                (item.hwid && item.hwid.toLowerCase().includes(f)) ||
                (item.plan && item.plan.toLowerCase().includes(f))
            );
        });

        if (filtered.length === 0) {
            historyEmpty.style.display = 'block';
            return;
        }
        historyEmpty.style.display = 'none';

        filtered.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${escapeHtml(item.customer || 'N/A')}</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(item.timestamp || '')}</div>
                </td>
                <td><code style="color: var(--accent-cyan);">${escapeHtml(item.hwid)}</code></td>
                <td><span class="badge-plan">${escapeHtml(item.plan)}</span></td>
                <td><strong>${escapeHtml(item.expiresAt)}</strong></td>
                <td><span style="color: #34D399; font-size: 12px; font-weight: 600;">● Hoạt động</span></td>
                <td>
                    <button class="btn-table-copy" data-token="${escapeHtml(item.token)}">
                        📋 Copy Key
                    </button>
                </td>
            `;
            historyTableBody.appendChild(tr);
        });

        historyTableBody.querySelectorAll('.btn-table-copy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const token = e.currentTarget.getAttribute('data-token');
                await navigator.clipboard.writeText(token);
                showToast('Đã copy mã key từ lịch sử!', 'success');
            });
        });
    }

    historySearch.addEventListener('input', (e) => {
        renderHistory(e.target.value);
    });

    btnClearHistory.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tạo key không?')) {
            localStorage.removeItem(STORAGE_KEY_HISTORY);
            renderHistory();
            showToast('Đã dọn sạch toàn bộ lịch sử!', 'info');
        }
    });

    btnExportHistory.addEventListener('click', () => {
        const list = getHistory();
        if (list.length === 0) {
            showToast('Chưa có dữ liệu để xuất file!', 'error');
            return;
        }
        let txt = '=== DANH SÁCH KEY BẢN QUYỀN KINXSUB ===\n\n';
        list.forEach((item, idx) => {
            txt += `[#${idx + 1}] Khách hàng: ${item.customer}\n`;
            txt += `Mã máy (HWID): ${item.hwid}\n`;
            txt += `Gói cước: ${item.plan} | Hết hạn: ${item.expiresAt}\n`;
            txt += `Key: ${item.token}\n`;
            txt += `Thời gian tạo: ${item.timestamp || 'N/A'}\n`;
            txt += `------------------------------------------------------------\n\n`;
        });
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `KinXSub_Licenses_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        showToast('Đã xuất file lịch sử thành công!', 'success');
    });

    // --- 8. Trial Claims Management (NEW) ---
    function getTrialRegistry() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TRIAL_REGISTRY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveTrialRegistry(reg) {
        localStorage.setItem(STORAGE_KEY_TRIAL_REGISTRY, JSON.stringify(reg));
    }

    function renderTrials(filter = '') {
        const reg = getTrialRegistry();
        const entries = Object.values(reg);
        trialTableBody.innerHTML = '';

        const f = filter.toLowerCase().trim();
        const filtered = entries.filter(item => {
            return (item.hwid && item.hwid.toLowerCase().includes(f));
        });

        if (filtered.length === 0) {
            trialEmpty.style.display = 'block';
            return;
        }
        trialEmpty.style.display = 'none';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filtered.forEach(item => {
            const exp = new Date(item.expDate);
            exp.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <code style="color: var(--accent-cyan); font-weight:700;">${escapeHtml(item.hwid)}</code>
                    <div style="font-size:11px; color:var(--text-muted);">Gói: ${escapeHtml(item.plan || 'Dùng thử 1 tháng')}</div>
                </td>
                <td>${item.claimedAt ? new Date(item.claimedAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
                <td><strong>${escapeHtml(item.expDate)}</strong></td>
                <td>
                    <span style="color: ${diffDays >= 0 ? '#34D399' : '#F43F5E'}; font-weight: 600;">
                        ${diffDays >= 0 ? `Còn ${diffDays} ngày` : 'Hết hạn'}
                    </span>
                </td>
                <td>
                    <button class="btn-action-unlock btn-unlock-trial" data-hwid="${escapeHtml(item.hwid)}">
                        🔓 Mở Khóa Nhận Lại
                    </button>
                    <button class="btn-table-copy btn-copy-trial-key" data-token="${escapeHtml(item.key)}" style="margin-left: 6px;">
                        📋 Copy Key
                    </button>
                </td>
            `;
            trialTableBody.appendChild(tr);
        });

        // Event listener: Unlock Trial (allow claiming again)
        trialTableBody.querySelectorAll('.btn-unlock-trial').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetHwid = e.currentTarget.getAttribute('data-hwid');
                if (confirm(`Bạn có chắc muốn mở khóa cho mã máy:\n${targetHwid}\n\nSau khi mở khóa, người dùng máy này có thể tự vào web nhận lại 1 tháng dùng thử mới.`)) {
                    const currentReg = getTrialRegistry();
                    delete currentReg[targetHwid];
                    saveTrialRegistry(currentReg);
                    renderTrials(trialSearch.value);
                    showToast(`Đã mở khóa thành công cho ${targetHwid}!`, 'success');
                }
            });
        });

        // Event listener: Copy Key
        trialTableBody.querySelectorAll('.btn-copy-trial-key').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const token = e.currentTarget.getAttribute('data-token');
                await navigator.clipboard.writeText(token);
                showToast('Đã copy mã key dùng thử!', 'success');
            });
        });
    }

    if (trialSearch) {
        trialSearch.addEventListener('input', (e) => {
            renderTrials(e.target.value);
        });
    }

    if (btnClearTrials) {
        btnClearTrials.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách máy dùng thử không?\n(Tất cả người dùng sẽ có thể nhận lại key dùng thử mới)')) {
                localStorage.removeItem(STORAGE_KEY_TRIAL_REGISTRY);
                renderTrials();
                showToast('Đã xóa danh sách dùng thử!', 'info');
            }
        });
    }

    if (btnExportTrials) {
        btnExportTrials.addEventListener('click', () => {
            const reg = getTrialRegistry();
            const entries = Object.values(reg);
            if (entries.length === 0) {
                showToast('Chưa có máy nào nhận dùng thử!', 'error');
                return;
            }
            let txt = '=== DANH SÁCH MÁY NHẬN DÙNG THỬ KINXSUB (1 THÁNG) ===\n\n';
            entries.forEach((item, idx) => {
                txt += `[#${idx + 1}] Mã máy (HWID): ${item.hwid}\n`;
                txt += `Ngày nhận: ${item.claimedAt || 'N/A'} | Hết hạn: ${item.expDate}\n`;
                txt += `Key: ${item.key}\n`;
                txt += `------------------------------------------------------------\n\n`;
            });
            const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `KinXSub_Trial_Claims_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            showToast('Đã xuất danh sách máy dùng thử!', 'success');
        });
    }

    // --- 9. Verify Key Tab ---
    btnVerify.addEventListener('click', async () => {
        const token = verifyKeyInput.value.trim();
        if (!token) {
            showToast('Vui lòng dán mã key cần kiểm tra!', 'error');
            return;
        }

        verifyResult.innerHTML = '<div style="color: #94A3B8;">Đang xác thực chữ ký số RSA-2048...</div>';
        verifyResult.style.display = 'block';

        const res = await window.KinXCrypto.verifyKey(token);

        if (res.valid) {
            verifyResult.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid #10B981; padding: 20px; border-radius: 12px; color: #fff;">
                    <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #34D399; font-size: 16px; margin-bottom: 12px;">
                        <span>✅</span> KEY HỢP LỆ VÀ NGUYÊN VẸN!
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 13px;">
                        <div><span style="color:#94A3B8;">Mã máy:</span> <br><code style="color:#38BDF8;">${escapeHtml(res.hwid)}</code></div>
                        <div><span style="color:#94A3B8;">Khách hàng:</span> <br><strong>${escapeHtml(res.customer || 'Không có')}</strong></div>
                        <div><span style="color:#94A3B8;">Gói cước:</span> <br><span class="badge-plan">${escapeHtml(res.plan)}</span></div>
                        <div><span style="color:#94A3B8;">Hạn sử dụng:</span> <br><strong>${escapeHtml(res.expiresAt)}</strong></div>
                        <div><span style="color:#94A3B8;">Còn lại:</span> <br><strong style="color: #34D399;">${res.daysLeft} ngày</strong></div>
                    </div>
                </div>
            `;
        } else {
            verifyResult.innerHTML = `
                <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid #F43F5E; padding: 20px; border-radius: 12px; color: #fff;">
                    <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #FB7185; font-size: 16px; margin-bottom: 8px;">
                        <span>❌</span> ${escapeHtml(res.message)}
                    </div>
                    <div style="font-size: 12px; color: #94A3B8;">Mã lỗi chi tiết: <code>${res.reason}</code></div>
                </div>
            `;
        }
    });

    // --- 10. Change PIN in Settings ---
    btnChangePin.addEventListener('click', () => {
        const oldPin = oldPinInput.value.trim();
        const newPin = newPinInput.value.trim();

        if (oldPin !== getStoredPin()) {
            showToast('Mã PIN hiện tại không chính xác!', 'error');
            oldPinInput.focus();
            return;
        }
        if (newPin.length < 4) {
            showToast('Mã PIN mới phải có ít nhất 4 ký tự!', 'error');
            newPinInput.focus();
            return;
        }

        localStorage.setItem(STORAGE_KEY_PIN, newPin);
        oldPinInput.value = '';
        newPinInput.value = '';
        showToast('Đã đổi mã PIN quản trị viên thành công!', 'success');
    });

    // --- Utilities ---
    function showToast(msg, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(msg)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Init App
    checkAuth();
});
