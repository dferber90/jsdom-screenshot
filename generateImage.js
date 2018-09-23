const puppeteer = require("puppeteer");
const merge = require("lodash.merge");
const debug = require("./debug");

const addArg = (opts, arg) => {
  if (!Array.isArray(opts.launch.args)) opts.launch.args = [];

  if (!opts.launch.args.includes(arg)) {
    opts.launch.args.push(arg);
  }
};

// starts a server and returns it
// - server runs on random open port
//   callers can use server.address().port to read the port
// - server serves "html" as index.html
// - server serves static files in all public paths
const createServer = async (html, { publicPaths }) => {
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
  publicPaths.forEach(p => app.use(serveStatic(p)));

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

  if (typeof opts.requestInterception === "function") {
    await page.setRequestInterception(true);
    page.on("request", opts.requestInterception);
  }

  await page.goto(
    url,
    opts.waitForResources ? { waitUntil: "networkidle0" } : {}
  );

  const image = await page.screenshot(opts.screenshot);
  browser.close();

  return image;
};

const defaultOpts = {
  waitForResources: true,
  launch: {},
  screenshot: undefined,
  publicPaths: []
};

const generateImage = async options => {
  const opts = merge({}, defaultOpts, options);

  // config sugar to let users specify viewport directly
  if (options && options.viewport && !opts.launch.defaultViewport) {
    opts.launch.defaultViewport = options.viewport;
  }

  if (!Array.isArray(opts.publicPaths)) {
    throw new Error("jsdom-screenshot: opts.publicPaths must be an array!");
  }

  // Disable "lcd text antialiasing" to avoid differences in the snapshots
  // depending on the used monitor.
  // See https://github.com/dferber90/jsdom-screenshot/issues/1
  addArg(opts, "--disable-lcd-text");

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
