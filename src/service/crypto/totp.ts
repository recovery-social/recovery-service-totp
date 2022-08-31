const crypto = require('crypto');


export const generateSecret = () => {
    return HexToBase32(crypto.randomBytes(20));
}

export const verify = (Secret: string, OTP: string, time: Date): boolean => {

    let Time = (new Date());
    if (time) {
        Time = time;
    }

    const K = Base32ToHex(Secret);
    const T = PadLeft(DecimalToHex(Math.floor((Math.round(((Time).getTime() / 1000.0))) / 30)), 16, '0');
    const totp = crypto
        .createHmac('sha1', K)
        .update(T, 'hex')
        .digest('hex');

    const offset = HexToDecimal(totp.substring(totp.length - 1));

    let gOTP = (HexToDecimal(totp.substr(offset * 2, 8)) & HexToDecimal('7fffffff')) + '';
    gOTP = (gOTP).substr(gOTP.length - 6, 6);

    return gOTP === OTP
}

export const getQrCodeUrl = (Secret: string, User: string, Issuer: string, h = 200, w = 200): string => {
    return `https://chart.googleapis.com/chart?chs=${h}x${w}&chld=M|` +
        `0&cht=qr&chl=otpauth://totp/${Issuer}:${User}?secret=${Secret}&issuer=${Issuer}`;
}

const DecimalToHex = (decimal: number): string => {
    return (decimal < 15.5 ? '0' : '') + Math.round(decimal).toString(16);
}

const HexToDecimal = (hex: string): number => {
    return parseInt(hex, 16);
}

const PadLeft = (string: string, length: number, padwith: string): string => {
    if (length + 1 >= string.length) {
        string = Array(length + 1 - string.length).join(padwith) + string;
    }
    return string;
}

const Base32ToHex = (base32: string): Buffer => {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';

    for (let i = 0; i < base32.length; i++) {
        let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += PadLeft(val.toString(2), 5, '0');
    }

    let eo = 0;
    for (let i = 0; i + 4 <= bits.length; i += 4) {
        let substr = bits.substr(i, 4);
        hex = hex + parseInt(substr, 2).toString(16);
        eo = i;
    }

    let chunk = PadLeft(bits.substr(eo, bits.length), 4, '0');
    hex = hex + parseInt(chunk, 2).toString(16);

    const h = Buffer.from(hex, 'hex');
    return h;
}

const HexToBase32 = (hex: Buffer): string => {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let base32 = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < hex.byteLength; i++) {
        value = (value << 8) | hex[i];
        bits += 8;

        while (bits >= 5) {
            base32 += base32chars[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    return base32;
}