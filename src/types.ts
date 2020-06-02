import { ScreenshotOptions, LaunchOptions, BrowserOptions, Request } from 'puppeteer';

const browserOptions: BrowserOptions = {};

type ViewportOptions = typeof browserOptions.defaultViewport;

export interface JsdomScreenshotOptions {
  /**
   * Passed to `puppeteer.launch([options])`
   * @see https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunch
   */
  launch?: LaunchOptions;

  /**
   * Passed to `page.screenshot([options])`
   * @see https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions
   */
  screenshot?: ScreenshotOptions;

  /**
   * You can provide a list of folders to serve statically. This is usefulwhen your
   * componentuses assets through relative links like `<img src="/party-parrot.gif" />`.
   *
   * In this case, you could provide `serve: ["images"]` when the `images` folderat the
   * root of your project (where you launch the tests from) contains `party-parrot.gif`.
   */
  serve?: string[];

  /**
   * Prints the jsdom markup to the console before taking the screenshot.
   * @see https://github.com/dferber90/jsdom-screenshot#debugging-jsdom
   */
  debug?: boolean;

  /**
   * This is a shortcut to set `options.launch.defaultViewport`.
   * `options.launch.defaultViewport` will take precedence in case both are passed.
   */
  viewport?: ViewportOptions;

  /**
   * A CSS selector can be provided to take a screenshot only of an element found
   * by given selector. This will set `puppeteer`s `options.screenshot.clip` to match
   * the given element's offset properties (`offsetLeft`, `offsetTop`, `offsetWidth`
   * and `offsetHeight`).
   *
   * @example
   * ```jsx
   * import React from "react";
   * import { generateImage, setDefaultOptions } from "jsdom-screenshot";
   * import { render } from "react-testing-library";
   * import { SomeComponent } from "<your-code>";
   *
   * it("should have no visual regressions", async () => {
   *   // display: "table" prevents div from using full width,
   *   // so the screenshot would not cover the full width here
   *   render(
   *     <div data-testid="root" style={{ display: "table" }}>
   *       <SomeComponent />
   *     </div>
   *   );
   *   const image = await generateImage({
   *     targetSelector: "[data-testid=root]"
   *   });
   *   expect(image).toMatchImageSnapshot();
   * });
   * ```
   */
  targetSelector?: string;

  /**
   * When set to `true`, `jsdom-screenshot` will wait until the network becomes idle
   * (all resources are loaded) before taking a screenshot. You can use this to ensure
   * that all resources are loaded before the screenshot is taken.
   *
   * It is disabled by default as it adds roughly one second to each screenshot. Use
   * it wisely to avoid slowing down tests unnecessarily. You can mock requests using
   * `options.intercept`.
   */
  waitUntilNetworkIdle?: boolean;

  /**
   * When provided, `puppeteer`'s request interception will be enabled. The provided function will be called
   * with the intercepted request. Activating request interception enables
   * [`request.abort`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestaborterrorcode),
   * [`request.continue`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestcontinueoverrides), and
   * [`request.respond`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestrespondresponse)
   * methods. This provides the capability to modify network requests that are made by a page.
   * This can be used to speed up tests by stubbing requests.
   *
   * @example
   * ```jsx
   * generateImage({
   *   intercept: request => {
   *     if (request.url().endsWith(".png") || request.url().endsWith(".jpg")) {
   *       // Blocks some images.
   *       request.abort();
   *     } else if (request.url().endsWith("/some-big-library.css")) {
   *       // Fake a response
   *       request.respond({
   *         status: 200,
   *         contentType: "text/css",
   *         body: "html, body { background: red }"
   *       });
   *     } else {
   *       // Call request.continue() for requests which should not be intercepted
   *       request.continue();
   *     }
   *   }
   * });
   * ```
   * @see https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetinterceptvalue
   */
  intercept?: (request: Request) => void;
}
