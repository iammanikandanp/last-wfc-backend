// controllers/gsheetProxyController.js
// Proxies a Google Sheet CSV export to avoid browser CORS restrictions.

const toGSheetCsvUrl = (url) => {
  const idMatch  = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) throw new Error("Invalid Google Sheet URL");

  // Extract gid from ?gid=... or #gid=...
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid      = gidMatch ? gidMatch[1] : "0";

  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
};

export const proxyGSheetCSV = async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: "url query param is required" });

  let csvUrl;
  try {
    csvUrl = toGSheetCsvUrl(url);
  } catch {
    return res.status(400).json({ success: false, message: "Invalid Google Sheet URL" });
  }

  try {
    const response = await fetch(csvUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WFC-Bot/1.0)",
        "Accept":     "text/csv,text/plain,*/*",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    // Google redirects to login page (HTML) when sheet is not public
    if (contentType.includes("text/html")) {
      return res.status(403).json({
        success: false,
        message: "Sheet is not publicly accessible — share it as 'Anyone with link can view'",
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: `Google returned status ${response.status} — make sure the sheet is shared as 'Anyone with link can view'`,
      });
    }

    const csv = await response.text();
    if (!csv.trim()) {
      return res.status(422).json({ success: false, message: "Sheet returned empty content" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Proxy fetch failed" });
  }
};
