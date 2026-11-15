import express from "express";
import path from "path";
import http from "http";
import https from "https";
import { createServer as createViteServer } from "vite";

const TLS_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function isTlsError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.cause?.code || "";
  const msg = String(err.message || err.cause?.message || "").toLowerCase();
  return (
    TLS_ERROR_CODES.has(code) ||
    code.startsWith("ERR_TLS") ||
    msg.includes("certificate") ||
    msg.includes("unable to verify") ||
    msg.includes("self signed") ||
    msg.includes("self-signed")
  );
}

interface RemoteFetchResult {
  statusCode: number;
  statusMessage: string;
  contentType: string;
  buffer: Buffer;
}

function requestWithNode(
  urlStr: string,
  rejectUnauthorized: boolean,
  redirectsLeft = 5,
  cookieHeader = ""
): Promise<RemoteFetchResult> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return reject(new Error("Invalid URL format"));
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return reject(new Error("Only http:// and https:// URLs are supported"));
    }

    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/pdf,application/octet-stream,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      Referer: `${parsed.origin}/`,
    };
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const req = transport.request(
      parsed,
      {
        method: "GET",
        headers,
        timeout: 30000,
        ...(isHttps ? { rejectUnauthorized } : {}),
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        const statusMessage = res.statusMessage || "";

        // Handle redirects
        if (
          [301, 302, 303, 307, 308].includes(statusCode) &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const nextUrl = new URL(res.headers.location, parsed).toString();
          const setCookies = res.headers["set-cookie"];
          const nextCookie = Array.isArray(setCookies)
            ? setCookies.map((c) => c.split(";")[0]).join("; ")
            : cookieHeader;
          return requestWithNode(
            nextUrl,
            rejectUnauthorized,
            redirectsLeft - 1,
            nextCookie
          )
            .then(resolve)
            .catch(reject);
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode,
            statusMessage,
            contentType: String(res.headers["content-type"] || "application/pdf"),
            buffer: Buffer.concat(chunks),
          });
        });
        res.on("error", reject);
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out while fetching remote PDF"));
    });

    req.on("error", reject);
    req.end();
  });
}

async function fetchRemotePdfWithTlsFallback(targetUrl: string): Promise<RemoteFetchResult> {
  try {
    return await requestWithNode(targetUrl, true);
  } catch (err: any) {
    if (isTlsError(err)) {
      return await requestWithNode(targetUrl, false);
    }
    throw err;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON parsing
  app.use(express.json());

  // PDF Proxy Endpoint to bypass browser CORS and handle incomplete TLS certificate chains
  app.get("/api/proxy-pdf", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      const result = await fetchRemotePdfWithTlsFallback(targetUrl);

      if (result.statusCode < 200 || result.statusCode >= 400) {
        return res.status(result.statusCode || 502).json({
          error: `Remote server returned HTTP ${result.statusCode}: ${result.statusMessage}`,
        });
      }

      const magic = result.buffer.subarray(0, 5).toString("ascii");
      const isPdfMagic = magic === "%PDF-";
      if (result.contentType.toLowerCase().includes("text/html") && !isPdfMagic) {
        return res.status(422).json({
          error: "The URL returned an HTML webpage instead of a PDF file.",
        });
      }

      res.setHeader(
        "Content-Type",
        result.contentType.includes("pdf") || isPdfMagic
          ? "application/pdf"
          : result.contentType
      );
      res.setHeader("Content-Length", result.buffer.length);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(result.buffer);
    } catch (err: any) {
      console.error("Error proxying PDF:", targetUrl, err);
      res.status(502).json({ error: err?.message || "Failed to fetch remote PDF" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
