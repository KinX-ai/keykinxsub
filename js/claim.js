/**
 * KinXSub Public Claim Page Controller
 * Handles 1-month fixed free trial key generation with 1-time-per-device restriction
 */

(function () {
    'use strict';

    // Storage Keys
    const REGISTRY_KEY = 'kinxsub_claimed_registry';
    const DEVICE_KEY = 'kx_claimed_device';

    // Elements
    const hwidInput = document.getElementById('claimHwidInput');
    const btnPaste = document.getElementById('btnClaimPaste');
    const btnSubmit = document.getElementById('btnSubmitClaim');
    const noticeContainer = document.getElementById('claimNoticeContainer');
    const resultCard = document.getElementById('claimResultCard');
    const resultKeyOutput = document.getElementById('claimKeyOutput');
    const resultExpDate = document.getElementById('claimExpDate');
    const resultDaysLeft = document.getElementById('claimDaysLeft');
    const resultHwidTag = document.getElementById('claimHwidTag');
    const btnCopyKey = document.getElementById('btnCopyClaimKey');
    const btnDownloadTxt = document.getElementById('btnDownloadClaimTxt');
    const toast = document.getElementById('toast');

    let currentClaimedKey = '';
    let currentRecord = null;

    // --- Helpers ---
    function showToast(message, duration = 3000) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    function getRegistry() {
        try {
            const raw = localStorage.getItem(REGISTRY_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveRegistry(reg) {
        try {
            localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
        } catch (e) {
            console.error('Failed to save registry', e);
        }
    }

    function formatHWID(val) {
        let cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleaned.startsWith('KX')) {
            cleaned = cleaned.slice(2);
        }
        cleaned = cleaned.slice(0, 16);
        const parts = ['KX'];
        for (let i = 0; i < cleaned.length; i += 4) {
            parts.push(cleaned.slice(i, i + 4));
        }
        return parts.join('-');
    }

    function isValidHWID(hwid) {
        return /^KX-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/i.test(hwid.trim());
    }

    function getDaysDiff(targetDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(targetDateStr);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function renderNotice(type, title, message) {
        if (!noticeContainer) return;
        const icon = type === 'warning' ? '⚠️' : '🎉';
        const cls = type === 'warning' ? 'notice-warning' : 'notice-success';
        noticeContainer.innerHTML = `
            <div class="claim-notice-banner ${cls}">
                <div class="notice-icon">${icon}</div>
                <div class="notice-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
            </div>
        `;
        noticeContainer.style.display = 'block';
    }

    function clearNotice() {
        if (!noticeContainer) return;
        noticeContainer.innerHTML = '';
        noticeContainer.style.display = 'none';
    }

    function displayResult(record, isAlreadyClaimed = false) {
        currentRecord = record;
        currentClaimedKey = record.key;

        resultKeyOutput.textContent = record.key;
        resultHwidTag.textContent = record.hwid;
        resultExpDate.textContent = record.expDate;

        const daysLeft = getDaysDiff(record.expDate);
        if (daysLeft >= 0) {
            resultDaysLeft.textContent = `(Còn ${daysLeft} ngày sử dụng)`;
            resultDaysLeft.style.color = '#34D399';
        } else {
            resultDaysLeft.textContent = `(Đã hết hạn)`;
            resultDaysLeft.style.color = '#F43F5E';
        }

        if (isAlreadyClaimed) {
            renderNotice(
                'warning',
                'Mã máy này đã được cấp bản quyền dùng thử 1 tháng trước đó!',
                `Mỗi máy tính chỉ được cấp bản quyền dùng thử 1 lần duy nhất. Dưới đây là mã kích hoạt đã cấp vào ngày <b>${new Date(record.claimedAt).toLocaleDateString('vi-VN')}</b>, bạn có thể sao chép lại để sử dụng.`
            );
            btnSubmit.innerHTML = '<span>📋 Đã Cấp Bản Quyền (Xem Key Bên Dưới)</span>';
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.7';
        } else {
            renderNotice(
                'success',
                'Chúc mừng! Kích hoạt bản quyền 1 tháng thành công!',
                `Key bản quyền Pro 30 ngày của bạn đã được tạo thành công với chứng thực RSA-2048 Bit. Hãy sao chép và kích hoạt ngay vào app KinXSub!`
            );
        }

        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // --- Input Listeners ---
    if (hwidInput) {
        hwidInput.addEventListener('input', function (e) {
            const cursor = e.target.selectionStart;
            const originalLength = e.target.value.length;
            const formatted = formatHWID(e.target.value);
            e.target.value = formatted;
            
            // Adjust cursor if dashes were inserted
            if (formatted.length > originalLength && (cursor === 3 || cursor === 8 || cursor === 13 || cursor === 18)) {
                e.target.setSelectionRange(cursor + 1, cursor + 1);
            }

            // Check if this HWID was already claimed
            const clean = formatted.trim().toUpperCase();
            if (clean.length === 22) {
                const reg = getRegistry();
                if (reg[clean]) {
                    displayResult(reg[clean], true);
                    return;
                }
            }

            // If not claimed or incomplete, reset state
            btnSubmit.disabled = false;
            btnSubmit.style.opacity = '1';
            btnSubmit.innerHTML = '<span>⚡ NHẬN KEY BẢN QUYỀN 1 THÁNG NGAY</span>';
        });

        // Trigger on paste
        hwidInput.addEventListener('paste', function () {
            setTimeout(() => {
                hwidInput.dispatchEvent(new Event('input'));
            }, 50);
        });
    }

    if (btnPaste) {
        btnPaste.addEventListener('click', async function () {
            try {
                const text = await navigator.clipboard.readText();
                if (!text || text.trim() === '') {
                    showToast('Clipboard trống! Hãy copy mã máy từ app KinXSub trước.');
                    return;
                }
                hwidInput.value = formatHWID(text.trim());
                hwidInput.dispatchEvent(new Event('input'));
                showToast('Đã dán mã máy từ Clipboard!');
            } catch (err) {
                showToast('Vui lòng cho phép quyền truy cập Clipboard trong trình duyệt.');
            }
        });
    }

    // --- Generate / Claim Button ---
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async function () {
            const rawHwid = (hwidInput.value || '').trim().toUpperCase();

            if (!isValidHWID(rawHwid)) {
                showToast('Vui lòng nhập đúng định dạng mã máy (KX-XXXX-XXXX-XXXX-XXXX)');
                hwidInput.focus();
                return;
            }

            const reg = getRegistry();

            // 1. Strict Check: HWID already claimed?
            if (reg[rawHwid]) {
                displayResult(reg[rawHwid], true);
                showToast('Mã máy này đã được nhận key dùng thử trước đó!');
                return;
            }

            // 2. Strict Check: Has this browser already claimed for another HWID?
            const deviceClaim = localStorage.getItem(DEVICE_KEY);
            if (deviceClaim && deviceClaim !== rawHwid && reg[deviceClaim]) {
                const confirmClaim = confirm(
                    `Trình duyệt này đã từng nhận key cho mã máy:\n${deviceClaim}\n\nQuy định: Mỗi người chỉ nhận 1 lần dùng thử. Bạn có chắc muốn tiếp tục tạo cho máy mới này?`
                );
                if (!confirmClaim) {
                    displayResult(reg[deviceClaim], true);
                    return;
                }
            }

            // Button loading effect
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right:8px;"></span> Đang ký số bản quyền RSA-2048...';

            try {
                // Ensure crypto engine is ready
                if (!window.KinXCrypto || !window.KinXCrypto.signLicensePayload) {
                    throw new Error('Hệ thống mã hóa chưa tải xong, vui lòng F5 lại trang.');
                }

                // 30 Days fixed expiry
                const now = new Date();
                const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const expDateStr = exp.toISOString().split('T')[0];
                const issuedDateStr = now.toISOString().split('T')[0];

                const payload = {
                    app: 'KinXSub',
                    hwid: rawHwid,
                    issued: issuedDateStr,
                    exp: expDateStr,
                    type: 'trial',
                    plan: 'Gói Dùng Thử 30 Ngày',
                    customer: 'Khách Tự Đăng Ký'
                };

                const signedToken = await window.KinXCrypto.signLicensePayload(payload);

                // Save to registry (1-time enforcement)
                const newRecord = {
                    hwid: rawHwid,
                    key: signedToken,
                    claimedAt: now.toISOString(),
                    expDate: expDateStr,
                    plan: 'Gói Dùng Thử (30 Ngày)',
                    days: 30
                };

                reg[rawHwid] = newRecord;
                saveRegistry(reg);
                localStorage.setItem(DEVICE_KEY, rawHwid);
                document.cookie = `kx_trial_${rawHwid.replace(/-/g, '_')}=1; max-age=31536000; path=/; SameSite=Lax`;

                // Display key
                displayResult(newRecord, false);
                showToast('🎉 Nhận Key 1 Tháng thành công!');

                // Try background logging to /api/claim (optional serverless hook)
                try {
                    fetch('/api/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newRecord)
                    }).catch(() => {});
                } catch (e) {}

            } catch (err) {
                console.error(err);
                showToast('Lỗi tạo key: ' + err.message);
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<span>⚡ NHẬN KEY BẢN QUYỀN 1 THÁNG NGAY</span>';
            }
        });
    }

    // --- Copy Key Button ---
    if (btnCopyKey) {
        btnCopyKey.addEventListener('click', async function () {
            if (!currentClaimedKey) return;
            try {
                await navigator.clipboard.writeText(currentClaimedKey);
                const oldText = btnCopyKey.innerHTML;
                btnCopyKey.innerHTML = '<span>✅ Đã Sao Chép!</span>';
                btnCopyKey.style.background = 'linear-gradient(135deg, #10B981, #059669)';
                showToast('Đã sao chép mã kích hoạt vào Clipboard!');
                setTimeout(() => {
                    btnCopyKey.innerHTML = oldText;
                    btnCopyKey.style.background = '';
                }, 2500);
            } catch (err) {
                showToast('Không thể sao chép tự động, vui lòng chọn và bôi đen mã key.');
            }
        });
    }

    // --- Download TXT Button ---
    if (btnDownloadTxt) {
        btnDownloadTxt.addEventListener('click', function () {
            if (!currentRecord) return;
            const content = [
                '=====================================================',
                '         THÔNG TIN BẢN QUYỀN KINXSUB (1 THÁNG)       ',
                '=====================================================',
                `Mã máy kích hoạt (HWID): ${currentRecord.hwid}`,
                `Gói dịch vụ            : ${currentRecord.plan}`,
                `Ngày kích hoạt         : ${new Date(currentRecord.claimedAt).toLocaleDateString('vi-VN')}`,
                `Ngày hết hạn           : ${currentRecord.expDate}`,
                '-----------------------------------------------------',
                'MÃ BẢN QUYỀN (ACTIVATION KEY):',
                currentRecord.key,
                '-----------------------------------------------------',
                'HƯỚNG DẪN KÍCH HOẠT:',
                '1. Mở phần mềm KinXSub trên máy tính của bạn.',
                '2. Nhấp vào mục "Đăng ký bản quyền" trên menu bên trái.',
                '3. Dán toàn bộ mã bản quyền ở trên vào ô "Mã kích hoạt".',
                '4. Nhấp nút "Kích hoạt ngay" để bắt đầu sử dụng đầy đủ tính năng.',
                '====================================================='
            ].join('\r\n');

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `KinXSub_License_${currentRecord.hwid}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Đã tải xuống file bản quyền!');
        });
    }

    // Check on page load if user already has an active claim
    window.addEventListener('DOMContentLoaded', () => {
        const lastHwid = localStorage.getItem(DEVICE_KEY);
        if (lastHwid) {
            const reg = getRegistry();
            if (reg[lastHwid]) {
                hwidInput.value = lastHwid;
                displayResult(reg[lastHwid], true);
            }
        }
    });

})();
