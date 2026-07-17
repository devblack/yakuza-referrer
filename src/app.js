import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { engine } from "express-handlebars";
import { decryptUrl } from "./helpers/Decryptor.js";
import { ExpiredUrl, InvalidHash, BadPayload } from "./errors/CryptoErrors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Serve static files
app.use(
  express.static("public", {
    maxAge: "1d", // Cache for 1 day
    etag: true,
  })
);
// Configure Handlebars
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      img: function (filename) {
        return `/images/${filename}`;
      },
      css: function (filename) {
        return `/css/${filename}`;
      },
      js: function (filename) {
        return `/js/${filename}`;
      },
      currentYear: function () {
        return new Date().getFullYear();
      },
    },
  })
);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");

app.get("/", (req, res) => {
  res.render("index", {
    title: "Welcome to Yakuza Referrer",
  });
});

app.get("/url/:target", (req, res) => {
  try {
    const targetUrl = decryptUrl(req.params.target);

    try {
      new URL(targetUrl);
    } catch {
      return res.status(500).render("50x", {
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
    if (error instanceof ExpiredUrl) {
      return res.status(410).render("40x", {
        title: "Link Expired",
        error: "This link has expired and is no longer valid.",
      });
    }

    if (error instanceof BadPayload) {
      return res.status(400).render("40x", {
        title: "Invalid Link",
        error: "This link is invalid or corrupted.",
      });
    }

    if (error instanceof InvalidHash) {
      return res.status(400).render("40x", {
        title: "Tampered Link",
        error: "This link has been tampered with or is invalid.",
      });
    }

    res.status(500).render("50x", {
      title: "Error",
      error: "An error occurred",
    });
  }
});

app.get("/privacy", (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy",
    lastUpdated: "2025-12-12",
  });
});

app.get("/tos", (req, res) => {
  res.render("tos", {
    title: "Terms of Service",
    lastUpdated: "2025-12-12",
  });
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found",
  });
});

export default app;
