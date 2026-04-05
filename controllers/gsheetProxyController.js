// controllers/gsheetProxyController.js
// Proxies a Google Sheet CSV export to avoid browser CORS restrictions.

const toGSheetCsvUrl = (url) => {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error("Invalid Google Sheet URL");
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=0`;
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
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch sheet — make sure it is shared as 'Anyone with link can view'",
      });
    }

    const contentType = response.headers.get("content-type") || "";
    // If Google redirected to a login page (HTML), the sheet is not public
    if (contentType.includes("text/html")) {
      return res.status(403).json({
        success: false,
        message: "Sheet is not publicly accessible — share it as 'Anyone with link can view'",
      });
    }

    const csv = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Proxy fetch failed" });
  }
};
