import crypto from "crypto";
import { BadPayload, ExpiredUrl, InvalidHash } from "../errors/CryptoErrors.js";

const SECRET = process.env.SECRET_REFERRER;

function b64urlDecode(input) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function decryptUrl(hash) {
  try {
    const raw = b64urlDecode(hash);

    if (raw.length < 12 + 16) {
      throw new BadPayload("INVALID HASH URL!");
    }

    const iv = raw.subarray(0, 12);
    const data = raw.subarray(12);

    const key = crypto.createHash("sha256").update(SECRET).digest();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

    const ciphertext = data.subarray(0, data.length - 16);
    const authTag = data.subarray(data.length - 16);

    if (authTag.length !== 16) {
      throw new BadPayload("INVALID HASH URL!");
    }

    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
    const sep = decrypted.lastIndexOf("|");
    if (sep === -1) throw new BadPayload("INVALID HASH URL!");

    const message = decrypted.slice(0, sep);
    const expiresAt = Number(decrypted.slice(sep + 1));

    if (Date.now() / 1000 > expiresAt) {
      throw new ExpiredUrl("INVALID HASH URL!");
    }

    return message;
  } catch (err) {
    const msg = String(err?.message || "");
    if (
      msg.includes("Invalid authentication tag") ||
      msg.includes("unable to authenticate") ||
      msg.includes("Unsupported state")
    ) {
      throw new InvalidHash("INVALID HASH URL!");
    }
    throw err;
  }
}
