// Cryptographic Engine for KinXSub RSA-2048 License Signing & Verification

const KinXCrypto = (function () {
    const N_INT = BigInt('0x' + window.KINX_KEYS.RSA_N);
    const D_INT = BigInt('0x' + window.KINX_KEYS.RSA_D);
    const E_INT = BigInt(window.KINX_KEYS.RSA_E);

    // Modular exponentiation: (base^exp) mod mod
    function modPow(base, exp, mod) {
        let res = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) res = (res * base) % mod;
            base = (base * base) % mod;
            exp = exp / 2n;
        }
        return res;
    }

    // URL-safe Base64 encode without padding
    function base64UrlEncode(str) {
        const utf8Bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binary += String.fromCharCode(utf8Bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // URL-safe Base64 decode
    function base64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) {
            str += '=';
        }
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    // Compute SHA-256 hash using native Web Crypto API
    async function sha256Bytes(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return BigInt('0x' + hashHex);
    }

    // Generate License Key
    async function generateKey({ hwid, days = 30, expiryDate = null, plan = 'VIP', customer = '' }) {
        hwid = hwid.trim().toUpperCase();
        if (!hwid) throw new Error('Mã máy (HWID) không được để trống!');

        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];

        let expStr;
        if (expiryDate) {
            expStr = expiryDate;
        } else if (days >= 36500) {
            expStr = '2099-12-31';
        } else {
            const expObj = new Date(todayObj);
            expObj.setDate(expObj.getDate() + parseInt(days, 10));
            expStr = expObj.toISOString().split('T')[0];
        }

        const payload = {
            hwid: hwid,
            exp: expStr,
            type: plan.toUpperCase(),
            created: todayStr
        };
        if (customer && customer.trim()) {
            payload.cust = customer.trim();
        }

        // Canonical JSON serialization (no spaces around separators)
        const payloadJson = JSON.stringify(payload);
        const payloadB64 = base64UrlEncode(payloadJson);

        // SHA-256 hash of UTF-8 payload bytes
        const hInt = (await sha256Bytes(payloadJson)) % N_INT;

        // RSA Signature: sig = (h^D) mod N
        const sigInt = modPow(hInt, D_INT, N_INT);
        const sigHex = sigInt.toString(16);

        const token = `KXACT-${payloadB64}.${sigHex}`;
        return {
            token,
            payload,
            days: (new Date(expStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24),
            expiresAt: expStr,
            plan: plan.toUpperCase()
        };
    }

    // Verify / Decode License Key
    async function verifyKey(token) {
        token = token.trim();
        if (!token.startsWith('KXACT-')) {
            return { valid: false, reason: 'invalid_format', message: 'Mã không đúng định dạng KinXSub (phải bắt đầu bằng KXACT-)' };
        }

        const raw = token.slice(6);
        const dotIdx = raw.indexOf('.');
        if (dotIdx === -1) {
            return { valid: false, reason: 'invalid_format', message: 'Cấu trúc key không hợp lệ (thiếu chữ ký số).' };
        }

        const payloadB64 = raw.slice(0, dotIdx);
        const sigHex = raw.slice(dotIdx + 1);

        let payload;
        let payloadJson;
        try {
            payloadJson = base64UrlDecode(payloadB64);
            payload = JSON.parse(payloadJson);
        } catch (e) {
            return { valid: false, reason: 'corrupt_payload', message: 'Nội dung gói dữ liệu bị hỏng hoặc bị sửa đổi!' };
        }

        // 1. Verify RSA-2048 Digital Signature: h == (sig^E) mod N
        try {
            const sigInt = BigInt('0x' + sigHex);
            const expectedH = modPow(sigInt, E_INT, N_INT);
            const actualH = (await sha256Bytes(payloadJson)) % N_INT;

            if (expectedH !== actualH) {
                return {
                    valid: false,
                    reason: 'bad_signature',
                    message: 'Chữ ký số RSA-2048 KHÔNG hợp lệ! Key có thể là hàng giả hoặc đã bị chỉnh sửa.',
                    payload
                };
            }
        } catch (e) {
            return { valid: false, reason: 'verify_error', message: 'Lỗi toán học khi kiểm tra chữ ký số.', payload };
        }

        // 2. Check Expiration
        const todayStr = new Date().toISOString().split('T')[0];
        const expStr = payload.exp || '';
        const today = new Date(todayStr);
        const expDate = new Date(expStr);

        const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        const isExpired = today > expDate;

        return {
            valid: !isExpired,
            isExpired,
            reason: isExpired ? 'expired' : 'ok',
            message: isExpired ? `Bản quyền đã hết hạn vào ngày ${expStr}!` : `Bản quyền hợp lệ! Còn ${daysLeft} ngày sử dụng.`,
            daysLeft: Math.max(0, daysLeft),
            expiresAt: expStr,
            plan: payload.type || 'VIP',
            hwid: payload.hwid || '',
            customer: payload.cust || '',
            created: payload.created || '',
            payload
        };
    }

    // Directly sign any custom payload object
    async function signLicensePayload(payload) {
        const payloadJson = JSON.stringify(payload);
        const payloadB64 = base64UrlEncode(payloadJson);
        const hInt = (await sha256Bytes(payloadJson)) % N_INT;
        const sigInt = modPow(hInt, D_INT, N_INT);
        const sigHex = sigInt.toString(16);
        return `KXACT-${payloadB64}.${sigHex}`;
    }

    return {
        generateKey,
        verifyKey,
        signLicensePayload
    };
})();

window.KinXCrypto = KinXCrypto;
