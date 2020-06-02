import http from 'http';
import merge from 'lodash.merge';
import express from 'express';
import getPort from 'get-port';
import puppeteer, { Page, BoundingBox } from 'puppeteer';
import serveStatic from 'serve-static';

import { AddressInfo } from 'net';
import { debug } from './debug';
import { getMergedOptions } from './options';
import { JsdomScreenshotOptions } from './types';

export async function generateImage(options: JsdomScreenshotOptions = {}) {
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
  const addr = server.address() as AddressInfo;
  const { port } = addr;
  const url = `http://localhost:${port}`;
  const screenshot = await takeScreenshot(url, opts);
  await new Promise(resolve => server.close(resolve));
  return screenshot;
}

/**
 * starts a server and returns it
 * - server runs on random open port
 *   callers can use server.address().port to read the port
 * - server serves "html" as index.html
 * - server serves static files in all public paths
 */
async function createServer(html: any, opts: JsdomScreenshotOptions) {
  let app = express();

  app = app.use((req, res, next) => {
    return req.url === '/' ? res.end(html) : next();
  });

  // serve all public paths
  (opts.serve ?? []).forEach(servedFolder => {
    app = app.use(serveStatic(servedFolder));
  });

  const port = await getPort();

  const server = http.createServer(app);

  return server.listen(port);
}

async function takeScreenshot(url: string, opts: JsdomScreenshotOptions) {
  // opts.screenshot may contain options which should get forwarded to
  // puppeteer's page.screenshot as they are
  const screenshotOptions = merge({}, opts.screenshot);
  // Options see:
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
  const browser = await puppeteer.launch(opts.launch);
  const page = await browser.newPage();
  if (typeof opts.intercept === 'function') {
    await page.setRequestInterception(true);
    page.on('request', opts.intercept);
  }
  await page.goto(url, opts.waitUntilNetworkIdle ? { waitUntil: 'networkidle0' } : {});
  // If user provided options.targetSelector we try to find that element and
  // use its bounding box to clip the screenshot.
  // When no element is found we fall back to opts.screenshot.clip in case it
  // was specified already
  if (opts.targetSelector) {
    screenshotOptions.clip = await determineBoundingBox(page, opts.targetSelector, screenshotOptions.clip);
  }
  const image = await page.screenshot(screenshotOptions);
  browser.close();
  return image;
}

async function determineBoundingBox(page: Page, targetSelector: string, fallbackClip?: BoundingBox) {
  return page.evaluate(s => {
    const target = document.querySelector(s);
    if (target) {
      return {
        x: target.offsetLeft,
        y: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      };
    }
    // fall back to manual clipping values in case the element could
    // not be found
    return fallbackClip;
  }, targetSelector);
}
