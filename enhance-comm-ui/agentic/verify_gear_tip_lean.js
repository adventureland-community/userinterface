/**
 * Headless Chrome: render agentic/verify_gear_tip_lean.html, print metrics,
 * save screenshot. Exit 0 if new tip is ≤45% of old height and structure OK.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.join(__dirname);
const htmlPath = path.join(root, "verify_gear_tip_lean.html");
const outPng = path.join(root, "verify_gear_tip_lean.png");
const chrome =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const html = fs.readFileSync(htmlPath, "utf8");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;
  const userData = path.join(root, ".chrome-gear-tip-verify");
  fs.mkdirSync(userData, { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--window-size=1100,900",
    `--user-data-dir=${userData}`,
    `--screenshot=${outPng}`,
    url,
  ];

  const child = spawn(chrome, args, { stdio: ["ignore", "pipe", "pipe"] });
  let err = "";
  child.stderr.on("data", (d) => {
    err += String(d);
  });
  child.on("close", async (code) => {
    // Re-open with dump-dom for metrics (screenshot run doesn't give title easily)
    const dumpArgs = [
      "--headless=new",
      "--disable-gpu",
      "--window-size=1100,900",
      `--user-data-dir=${userData}`,
      "--dump-dom",
      url,
    ];
    const dump = spawn(chrome, dumpArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let dom = "";
    dump.stdout.on("data", (d) => {
      dom += String(d);
    });
    dump.on("close", () => {
      server.close();
      const m = dom.match(/GEAR_TIP_METRICS (\{[^<]+\})/);
      const metricsEl = dom.match(/id="metrics"[^>]*>(\{[^<]+\})/);
      let metrics = null;
      try {
        if (m) metrics = JSON.parse(m[1]);
        else if (metricsEl) metrics = JSON.parse(metricsEl[1]);
      } catch (_) {}

      console.log(
        JSON.stringify(
          {
            chromeExit: code,
            screenshot: fs.existsSync(outPng) ? outPng : null,
            metrics,
          },
          null,
          2,
        ),
      );

      if (!metrics) {
        console.error("No metrics parsed");
        process.exit(1);
      }
      const ok =
        metrics.rows === 5 &&
        metrics.gearCats === 1 &&
        metrics.sourceMentions === 0 &&
        metrics.whenOnce === 1 &&
        metrics.newH / metrics.oldH <= 0.45;
      if (!ok) {
        console.error("Lean tip checks failed", metrics);
        process.exit(1);
      }
      console.log("OK: lean multi-slot gear tip verified");
      process.exit(0);
    });
  });
});
