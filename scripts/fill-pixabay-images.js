const fs = require("fs");
const https = require("https");
const path = require("path");
const vm = require("vm");

const apiKey = process.env.PIXABAY_API_KEY;

if (!apiKey) {
  throw new Error("PIXABAY_API_KEY is required.");
}

const rootDir = path.resolve(__dirname, "..");
const dataPath = path.join(rootDir, "data.js");
const assetsDir = path.join(rootDir, "assets", "pixabay");
const imageMapPath = path.join(rootDir, "src", "data", "pixabayImages.js");
const cachePath = path.join(rootDir, ".pixabay-cache.json");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "word";

const requestJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: "application/json" } }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });

const requestJsonWithRetry = async (url, retries = 5) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestJson(url);
    } catch (error) {
      const isRetryable =
        /HTTP 429/.test(error.message) ||
        /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/.test(error.message);

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      const waitMs = /HTTP 429/.test(error.message)
        ? 70000 + attempt * 30000
        : 10000 + attempt * 10000;
      console.log(`Pixabay retry after ${error.message}; waiting ${Math.round(waitMs / 1000)}s`);
      await delay(waitMs);
    }
  }

  return null;
};

const downloadFile = (url, destination) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.rmSync(destination, { force: true });
          downloadFile(res.headers.location, destination).then(resolve, reject);
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          file.close();
          fs.rmSync(destination, { force: true });
          reject(new Error(`Download failed ${res.statusCode}: ${url}`));
          return;
        }

        res.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (error) => {
        file.close();
        fs.rmSync(destination, { force: true });
        reject(error);
      });
  });

const readWords = () => {
  const source = fs.readFileSync(dataPath, "utf8");
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__words = words;`, context, {
    filename: dataPath,
  });

  return {
    source,
    words: context.globalThis.__words,
  };
};

const loadCache = () => {
  if (!fs.existsSync(cachePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(cachePath, "utf8"));
};

const saveCache = (cache) => {
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
};

const searchPixabay = async (term) => {
  const query = encodeURIComponent(term);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&lang=en&safesearch=true&order=popular&per_page=3`;
  const result = await requestJsonWithRetry(url);
  return result.hits?.[0] || null;
};

const updateDataSource = (source, imageByEnglish) =>
  source.replace(
    /(\n\s*\{\s*\n\s*english: "([^"]+)",[\s\S]*?\n\s*imgSrc: ")[^"]*(",)/g,
    (match, prefix, english, suffix) => {
      const imgSrc = imageByEnglish[english];
      if (!imgSrc) {
        return match;
      }

      return `${prefix}${imgSrc}${suffix}`;
    },
  );

const writeImageMap = (assetKeys) => {
  const lines = [
    "export const pixabayImages = {",
    ...assetKeys.map(
      (key) => `  "${key}": require("../../assets/${key}"),`,
    ),
    "};",
    "",
    "export const getPixabayImageSource = (imgSrc) => {",
    "  if (!imgSrc) {",
    "    return null;",
    "  }",
    "",
    "  if (/^(https?:|data:|file:)/.test(imgSrc)) {",
    "    return { uri: imgSrc };",
    "  }",
    "",
    "  return pixabayImages[imgSrc] || null;",
    "};",
    "",
  ];

  fs.writeFileSync(imageMapPath, lines.join("\n"), "utf8");
};

const main = async () => {
  fs.mkdirSync(assetsDir, { recursive: true });

  const { source, words } = readWords();
  const cards = words.flatMap((lesson) => lesson.cards || []);
  const cache = loadCache();
  const imageByEnglish = {};
  const assetKeys = [];
  let searched = 0;
  let downloaded = 0;
  let missing = 0;

  for (const card of cards) {
    const english = card.english;
    const cacheKey = english.toLowerCase();

    if (!cache[cacheKey]) {
      const hit = await searchPixabay(english);
      searched += 1;

      if (hit) {
        cache[cacheKey] = {
          id: hit.id,
          pageURL: hit.pageURL,
          tags: hit.tags,
          previewURL: hit.previewURL,
        };
      } else {
        cache[cacheKey] = null;
      }

      saveCache(cache);
      await delay(1200);
    }

    const cached = cache[cacheKey];
    if (!cached?.previewURL) {
      missing += 1;
      continue;
    }

    const extension =
      path.extname(new URL(cached.previewURL).pathname).toLowerCase() || ".jpg";
    const filename = `${slugify(english)}-${cached.id}${extension}`;
    const destination = path.join(assetsDir, filename);
    const assetKey = `pixabay/${filename}`;

    if (!fs.existsSync(destination)) {
      await downloadFile(cached.previewURL, destination);
      downloaded += 1;
    }

    imageByEnglish[english] = assetKey;
    assetKeys.push(assetKey);

    if ((assetKeys.length + missing) % 25 === 0) {
      console.log(
        `Processed ${assetKeys.length + missing}/${cards.length}; downloaded ${downloaded}; missing ${missing}`,
      );
    }
  }

  const updatedSource = updateDataSource(source, imageByEnglish);
  fs.writeFileSync(dataPath, updatedSource, "utf8");
  writeImageMap(assetKeys);

  console.log(
    JSON.stringify(
      {
        totalCards: cards.length,
        images: assetKeys.length,
        missing,
        searched,
        downloaded,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
