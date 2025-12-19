import crypto from "crypto";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { decryptUrl } from "../src/helpers/Decryptor.js";
import { BadPayload, ExpiredUrl, InvalidHash } from "../src/errors/CryptoErrors.js";

// Helper function to encrypt URLs for testing
function encryptUrl(message, expiresAt) {
  const SECRET = process.env.SECRET_REFERRER || "test-secret-key";
  const key = crypto.createHash("sha256").update(SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload = `${message}|${expiresAt}`;
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

describe("decryptUrl", () => {
  let originalSecret;

  before(() => {
    originalSecret = process.env.SECRET_REFERRER;
    process.env.SECRET_REFERRER = "test-secret-key";
  });

  after(() => {
    process.env.SECRET_REFERRER = originalSecret;
  });

  it("should successfully decrypt a valid URL", () => {
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const hash = encryptUrl(url, expiresAt);

    const result = decryptUrl(hash);
    assert.strictEqual(result, url);
  });

  it("should decrypt URLs with special characters", () => {
    const url = "https://example.com/path?param=value&other=123";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const hash = encryptUrl(url, expiresAt);

    const result = decryptUrl(hash);
    assert.strictEqual(result, url);
  });

  it("should throw ExpiredUrl for expired URLs", () => {
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) - 3600;
    const hash = encryptUrl(url, expiresAt);

    assert.throws(() => decryptUrl(hash), ExpiredUrl);
  });

  it("should throw BadPayload for hash with insufficient length", () => {
    const shortHash = "dGVzdA";

    assert.throws(() => decryptUrl(shortHash), BadPayload);
  });

  it("should throw InvalidHash for tampered data", () => {
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    let hash = encryptUrl(url, expiresAt);

    // Tamper with the hash
    const decoded = Buffer.from(
      hash.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    decoded[15] = decoded[15] ^ 0xff;
    hash = decoded
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    assert.throws(() => decryptUrl(hash), InvalidHash);
  });

  it("should throw BadPayload for malformed payload without separator", () => {
    const SECRET = process.env.SECRET_REFERRER;
    const key = crypto.createHash("sha256").update(SECRET).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const payload = "https://example.com";
    const encrypted = Buffer.concat([
      cipher.update(payload, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, encrypted, authTag]);
    const hash = combined
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    assert.throws(() => decryptUrl(hash), BadPayload);
  });

  it("should handle different secret keys correctly", () => {
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    process.env.SECRET_REFERRER = "secret1";
    const hash = encryptUrl(url, expiresAt);

    process.env.SECRET_REFERRER = "secret2";
    assert.throws(() => decryptUrl(hash), InvalidHash);

    process.env.SECRET_REFERRER = "test-secret-key";
  });
});

describe("Express Route: GET /url/:target", () => {
  let originalSecret, originalEnv;

  before(() => {
    originalSecret = process.env.SECRET_REFERRER;
    originalEnv = process.env.NODE_ENV;
    process.env.SECRET_REFERRER = "test-secret-key";
  });

  after(() => {
    process.env.SECRET_REFERRER = originalSecret;
    process.env.NODE_ENV = originalEnv;
  });

  // Mock request and response objects
  function createMocks() {
    const req = { params: {} };
    const res = {
      statusCode: 200,
      rendered: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      render(view, data) {
        this.rendered = { view, data };
        return this;
      },
    };
    return { req, res };
  }

  const routeHandler = (req, res) => {
    try {
      const targetUrl = decodeURIComponent(decryptUrl(req.params.target));
      try {
        new URL(targetUrl);
      } catch {
        return res.status(400).render("50x", {
          title: "Error",
          error: "Invalid URL format",
        });
      }
      res.render("referrer", {
        title: "Referrer . . .",
        target: targetUrl,
        autoRedirect: true,
        delay: 10,
      });
    } catch (error) {
      const errorMsg =
        process.env.NODE_ENV === "production"
          ? "An error occurred"
          : error.message;
      res.status(500).render("50x", {
        title: "Error",
        error: errorMsg,
      });
    }
  };

  it("should render referrer page for valid encrypted URL", () => {
    const { req, res } = createMocks();
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const hash = encryptUrl(url, expiresAt);

    req.params.target = hash;
    routeHandler(req, res);

    assert.strictEqual(res.rendered.view, "referrer");
    assert.strictEqual(res.rendered.data.title, "Referrer . . .");
    assert.strictEqual(res.rendered.data.target, url);
    assert.strictEqual(res.rendered.data.autoRedirect, true);
    assert.strictEqual(res.rendered.data.delay, 10);
  });

  it("should handle URL-encoded encrypted hashes", () => {
    const { req, res } = createMocks();
    const url = "https://example.com/path";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const hash = encodeURIComponent(encryptUrl(url, expiresAt));

    req.params.target = hash;
    routeHandler(req, res);

    assert.strictEqual(res.rendered.view, "referrer");
    assert.strictEqual(res.rendered.data.target, url);
  });

  it("should return 400 for invalid URL format", () => {
    const { req, res } = createMocks();
    const invalidUrl = "not-a-url";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const hash = encryptUrl(invalidUrl, expiresAt);

    req.params.target = hash;
    routeHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.rendered.view, "50x");
    assert.strictEqual(res.rendered.data.error, "Invalid URL format");
  });

  it("should return 500 for expired URLs", () => {
    const { req, res } = createMocks();
    const url = "https://example.com";
    const expiresAt = Math.floor(Date.now() / 1000) - 3600;
    const hash = encryptUrl(url, expiresAt);

    req.params.target = hash;
    routeHandler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.rendered.view, "50x");
  });

  it("should return 500 for invalid hash", () => {
    const { req, res } = createMocks();
    req.params.target = "invalid-hash";
    routeHandler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.rendered.view, "50x");
  });

  it("should hide error details in production mode", () => {
    process.env.NODE_ENV = "production";
    const { req, res } = createMocks();
    req.params.target = "invalid-hash";
    routeHandler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.rendered.data.error, "An error occurred");
  });

  it("should show error details in non-production mode", () => {
    process.env.NODE_ENV = "development";
    const { req, res } = createMocks();
    req.params.target = "invalid-hash";
    routeHandler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.notStrictEqual(res.rendered.data.error, "An error occurred");
  });
});
