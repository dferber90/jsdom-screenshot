# jsdom-screenshot

Generate screenshots of JSDOM.

Useful for visual regression testing.

This package will only give you the image, you'll have to diff it with something else (like [`jest-image-snapshot`](https://www.npmjs.com/package/jest-image-snapshot)). If you are using Jest, you might be interested in [jest-transform-css](https://github.com/dferber90/jest-transform-css), which allows you to load styles into your Jest test setup.

> This package can be paired with [jest-transform-css](https://github.com/dferber90/jest-transform-css) and [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) to enable Visual Regression Testing in Jest. See [jest-transform-css](https://github.com/dferber90/jest-transform-css) for more information.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Options](#options)
    - [`options.launch`](#-optionslaunch-)
    - [`options.screenshot`](#-optionsscreenshot-)
    - [`options.publicPaths`](#-optionspublicpaths-)
    - [`options.debug`](#-optionsdebug-)
    - [`options.viewport`](#-optionsviewport-)
    - [`options.waitUntilNetworkIdle`](#-optionswaituntilnetworkidle-)
    - [`options.requestInterception`](#-optionsrequestinterception-)
  - [Changing viewport](#changing-viewport)
- [How it works](#how-it-works)
  - [High level](#high-level)
  - [Technically](#technically)
- [Debugging](#debugging)
  - [Debugging JSDOM](#debugging-jsdom)
  - [Debugging `puppeteer`](#debugging--puppeteer-)
- [Attribution](#attribution)

## Install

```
npm install jsdom-screenshot --save-dev
```

## Usage

You must be in a [jsdom](https://github.com/jsdom/jsdom) environment.

```js
import { generateImage } from "jsdom-screenshot";

// add some content to jsdom (this could also be React or any other library!)
const div = document.createElement("div");
div.innerText = "Hello World";
document.body.appendChild(div);

// take screenshot
generateImage(component, options);
```

### Options

```js
options = {
  // Options used to launch Puppeteer (puppeteer.launch(options))
  launch: {},
  // Options used to take a screenshot (puppeteer.screenshot(options))
  screenshot: {},
  // An array of folders containing static files to be served
  publicPaths: ["pubilc", "assets"],
  // Prints the jsdom markup to the console before taking the screenshot
  debug: true,
  // Wait for resources to be loaded before taking the screenshot
  waitUntilNetworkIdle: false,
  // Shortcut to set launch.defaultViewport
  viewport: {},
  // Enables request interception
  requestInterception: () => {}
};
```

#### `options.launch`

`launch` options are passed to `puppeteer.launch([options])`, see [`docs`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunch).

#### `options.screenshot`

`screenshot` options are passed to `page.screenshot([options])`, see [`docs`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions).

#### `options.publicPaths`

`publicPaths` is an array of strings. You can provide a list of folders to serve statically. This is useful when your component uses assets through relative links like `<img src="/party-parrot.gif" />`.

In this case, you could provide `publicPaths: ["images"]` when the `images` folder at the root of your project (where you launch the tests from) contains `party-parrot.gif`.

#### `options.debug`

Prints the jsdom markup to the console before taking the screenshot.

See the [Debugging JSDOM](#debugging-jsdom) section below for more information.

#### `options.viewport`

This is a shortcut to set `options.launch.defaultViewport`. `options.launch.defaultViewport` will take precedence in case both are passed.

#### `options.waitUntilNetworkIdle`

When set to `true`, `jsdom-screenshot` will wait until the network becomes idle (all resources are loaded) before taking a screenshot.
You can use this to ensure that all resources are loaded before the screenshot is taken.

It is disabled by default as it adds roughly one second to each screenshot. Use it wisely to avoid slowing down tests unnecessarily. You can mock requests using [`options.requestInterception`](#-optionsrequestinterception-).

#### `options.requestInterception`

When provided, `puppeteer`'s request interception will be enabled. The provided function will be called with the intercepted request.

Activating request interception enables [`request.abort`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestaborterrorcode), [`request.continue`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestcontinueoverrides) and [`request.respond`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestrespondresponse) methods. This provides the capability to modify network requests that are made by a page.

This can be used to speed up tests by stubbing requests.

```js
generateImage({
  requestInterception: request => {
    if (request.url().endsWith(".png") || request.url().endsWith(".jpg")) {
      // Blocks some images.
      request.abort();
    } else if (request.url().endsWith("/some-big-library.css")) {
      // Fake a response
      request.respond({
        status: 200,
        contentType: "text/css",
        body: "html, body { background: red }"
      });
    } else {
      // Call request.continue() for requests which should not be intercepted
      request.continue();
    }
  }
});
```

See [`page.setRequestInterception`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetrequestinterceptionvalue) of `puppeteer`.

### Changing viewport

Puppeteer will use an 800x600 viewport by default. You can change the viewport by passing `launch.defaultViewport`:

```js
generateImage({
  launch: {
    defaultViewport: { width: 1024, height: 768 }
  }
});
```

As this is a lot of typing, there is a shortcut for it:

```js
generateImage({ viewport: { width: 1024, height: 768 } });
```

`launch.defaultViewport` / `viewport` also supports `deviceScaleFactor`, `isMobile`, `hasTouch` and `isLandscape`.

See [`launch.defaultViewport`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunch).

## How it works

### High level

[`jsdom`](https://github.com/jsdom/jsdom) is an emulator of a subset of browser features. `jsdom` does not have the capability to render visual content, and will act like a headless browser by default. `jsdom` does not do any layout or rendering [ref](https://github.com/jsdom/jsdom#pretending-to-be-a-visual-browser). We use `jsdom` to obtain the state of the HTML which we want to take a screenshot of. Consumers can use `jsdom` to easily get components into the state they want to take a screenshot of. `jsdom-screenshot` then uses the markup ("the HTML") at that moment (of that state). `jsdom-screenshot` launches a local webserver and serves the obtained markup as `index.html`. It further serves assets provided through `publicPaths` so that local assets are loaded. Then `jsdom-screenshot` uses [`puppeteer`](https://github.com/googlechrome/puppeteer/) to take a screenshot take screenshots of that page using headless Google Chrome.

### Technically

The `generateImage` function reads the whole markup of `jsdom` using `document.documentElement.outerHTML`.

It then starts a local webserver on a random open port to serve the obtained markup as as `index.html`.

Once the server is read, it launches a [`puppeteer`](https://github.com/googlechrome/puppeteer/) instance and opens that `index.html` page.
It waits until all resources are loaded (the network becomes idle) before taking a screenshot.

It then returns that screenshot.

## Performance

Launching `puppeteer` to take a screenshot takes around 750ms. The rest depends on your application. You should try to mock/stub network requests to keep tests fast (see [`options.requestInterception`](#-optionsrequestinterception-)).

You should not go overboard with Visual Regression Tests, but a few errors caught with
good Visual Regression Tests will make up for the lost time in tests. Find a good balance that works for you.

## Debugging

### Debugging JSDOM

You can print the markup of `jsdom` which gets passed to `puppeteer` to take the screenshot by passing `debug: true`:

```js
generateImage({ debug: true });
```

You can also import the `debug` function and call it manually at any point. It will log the markup of `jsdom` to the console:

```js
import { generateImage, debug } from "jsdom-screenshot";

it("should have no visual regressions", async () => {
  const div = document.createElement("div");
  div.innerText = "Hello World";
  document.body.appendChild(div);

  debug(); // <---- prints the jsdom markup to the console

  expect(await generateImage()).toMatchImageSnapshot();
});
```

### Debugging `puppeteer`

You can set the following `launch` in case you need to debug what the page looks like before taking a screenshot:

```js
generateImage({
  launch: {
    // Whether to auto-open a DevTools panel for each tab.
    // If this option is true, the headless option will be set false.
    devtools: true,
    // Whether to run browser in headless mode.
    // Defaults to true unless the devtools option is true.
    headless: false,
    // Slows down Puppeteer operations by the specified amount of milliseconds.
    // Useful so that you can see what is going on.
    slowMo: 500
  }
});
```

## Attribution

This package was built by massively rewriting [`component-image`](https://github.com/corygibbons/component-image/). Huge thanks to [@corygibbons](https://github.com/corygibbons) for laying the foundation of this package.
