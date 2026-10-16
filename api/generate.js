// Vercel Serverless Function: POST /api/generate
const crypto = require('crypto');

const RSA_N = BigInt('0x8b6d804c40867c72acb1a381b41339c16c241aff3f513b99c0e65db2ab6db14b45e40b08b87f38f5d539acc8390bddda268486daeeedca8068f65f40cda36885e48df409ec2f658ae843b82b7e25e9c4c3fd323e4b01adf34b5177b64b89aa7f6cdd141b200877647b67c71c8fe57a2cf17b0770d1b94170c1fbb2020d9969a526624676cd801e4dd7661e0c85259a00f2bdb8afabf70d5555b030c524041234565728573729895652a6e5056e81cef7223976cb7ab6f33bf6204a45b881b60b6fd444067f5d561bc2f27380f24b46ba0245f52183a90d65c029aaba78d635fe205d84d33c0864edc05ef9b4bacecb5193e42547ad24302a0e8c4346701a554f');
const RSA_D = BigInt('0x392f2502a128475c4505ea58a501899b91fdd0f0c5084d18876c341bb6819bc89296b00bd8979d45fe38d46b9e3206c095319f99a58af395ecf6b7247df2ba48c7ef8c9a913af33ba07d3dc8e0c92df29cab78f2e19283c4982c869bc6a964bb346c0bf6001258dd665baee741014e35a6a8dde960aac97334ac455ae036fe83b4f8ca0605aa110768d9352f0de75be743a5e9567e45ae19cc5f38881583a88c1ec54be336a05b4d6b4253e6bcdd9c5133b46a2c7bb3d2358f34e00959b2017470801ffc5aa9eb37c332715426c2a47a2d8f92ef6513ed854e714700d462bfdd327d4544e4ae6c9630703e92c06c28406542108431a05fbefd87fb890c9bb6a9');

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

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { hwid, days = 30, expiryDate, plan = 'VIP', customer = '' } = req.body || {};

    if (!hwid || !hwid.trim()) {
      return res.status(400).json({ error: 'Mã máy (hwid) là bắt buộc!' });
    }

    const cleanHwid = hwid.trim().toUpperCase();
    const today = new Date().toISOString().split('T')[0];

    let expStr;
    if (expiryDate) {
      expStr = expiryDate;
    } else if (parseInt(days, 10) >= 36500) {
      expStr = '2099-12-31';
    } else {
      const expObj = new Date();
      expObj.setDate(expObj.getDate() + parseInt(days, 10));
      expStr = expObj.toISOString().split('T')[0];
    }

    const payload = {
      hwid: cleanHwid,
      exp: expStr,
      type: (plan || 'VIP').toUpperCase(),
      created: today
    };
    if (customer && customer.trim()) {
      payload.cust = customer.trim();
    }

    const payloadJson = JSON.stringify(payload);
    const payloadBytes = Buffer.from(payloadJson, 'utf-8');
    const payloadB64 = base64url(payloadBytes);

    const hash = crypto.createHash('sha256').update(payloadBytes).digest();
    const hInt = BigInt('0x' + hash.toString('hex')) % RSA_N;
    const sigInt = modPow(hInt, RSA_D, RSA_N);
    const sigHex = sigInt.toString(16);

    const token = `KXACT-${payloadB64}.${sigHex}`;

    return res.status(200).json({
      success: true,
      token,
      payload,
      expiresAt: expStr,
      days: Math.round((new Date(expStr) - new Date(today)) / (1000 * 60 * 60 * 24))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Lỗi xử lý máy chủ' });
  }
};
