const puppeteer = require("puppeteer");
const debug = require("./debug");
const { getMergedOptions } = require("./options");

// starts a server and returns it
// - server runs on random open port
//   callers can use server.address().port to read the port
// - server serves "html" as index.html
// - server serves static files in all public paths
const createServer = async (html, { serve }) => {
  const http = require("http");
  const connect = require("connect");
  const serveStatic = require("serve-static");
  const finalhandler = require("finalhandler");

  const app = connect();
  app.use(
    (request, response, next) =>
      request.url === "/" ? response.end(html) : next()
  );

  // serve all public paths
  serve.forEach(servedFolder => app.use(serveStatic(servedFolder)));

  app.use(finalhandler);
  const server = http.createServer(app);

  // Start server on a random unused port.
  //
  // We can't use a predeterimined port as Jest runs tests in parrallel, so
  // multiple tests would attempt to use the same port.
  //
  // Inspired by https://gist.github.com/mikeal/1840641
  await new Promise((resolve, reject) => {
    const startServer = () => {
      // 0 assigns a random port, but it does not guarantee that it is unsed
      // We still need to handle that case
      server.once("error", e => {
        if (e.code === "EADDRINUSE") server.close(startServer);
      });
      // 0 assigns a random port.
      // The port may be used, so we have to retry to find an unused port
      server.listen(0, err => (err ? reject(err) : resolve()));
    };
    startServer();
  });

  return server;
};

const takeScreenshot = async (url, opts) => {
  // Options see:
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
  const browser = await puppeteer.launch(opts.launch);
  const page = await browser.newPage();

  if (typeof opts.intercept === "function") {
    await page.setRequestInterception(true);
    page.on("request", opts.intercept);
  }

  await page.goto(
    url,
    opts.waitUntilNetworkIdle ? { waitUntil: "networkidle0" } : {}
  );

  // If user provided options.target then we try to query previously marked element offset to clip the screenshot
  const clip = await page.evaluate( (targetSelector) => {
    if (targetSelector) {
      const target = document.querySelector(targetSelector);
      if (target) {
        return {
          x: target.offsetLeft,
          y: target.offsetTop,
          width: target.offsetWidth,
          height: target.offsetHeight
        };
      }
    }
  }, opts.targetSelector);
  if(clip) {
    opts.screenshot = opts.screenshot || {};
    opts.screenshot.clip = clip;
  }

  const image = await page.screenshot(opts.screenshot);
  browser.close();

  return image;
};

const generateImage = async options => {
  const opts = getMergedOptions(options);

  // Allows easy debugging by passing generateImage({ debug: true })
  if (opts.debug) debug(document);

  // get HTML from JSDOM
  const html = document.documentElement.outerHTML;

  // We start a server to enable serving local assets.
  // The adds only ~0.05s so it's not worth skipping it.
  // Using a server further enables intercepting requests with relative urls,
  // which would not be possible when using page.goto(`data:text/html,${html}`).catch
  //
  // Another approach would be to use page.setContent(html) and to not start a
  // node server at all.
  //
  // But then we can't wait for files to be loaded
  // https://github.com/GoogleChrome/puppeteer/issues/728#issuecomment-334301491
  //
  // And we would not be able to serve local assets (the ones included through
  // tags like <img src="/party-parrot.gif" />). We run the node server instead
  // to serve the generated html and to serve local assets.
  const server = await createServer(html, opts);
  const url = `http://localhost:${server.address().port}`;
  const screenshot = await takeScreenshot(url, opts);
  await new Promise(resolve => server.close(resolve));
  return screenshot;
};

module.exports = generateImage;
