# jsdom-screenshot

Generate screenshots of JSDOM.

> ⚠️ **This package is useful for visual regression testing, but highly experimental.**
>
> **If you just want visual regression testing that works, I'd recommend using a CI service for it. Otherwise you'll run differences due to different operating systems, font-rendering, animations and even GPUs.**

This package will only give you the image, you'll have to diff it with something else (like [`jest-image-snapshot`](https://www.npmjs.com/package/jest-image-snapshot)). If you are using Jest, you might be interested in [jest-transform-css](https://github.com/dferber90/jest-transform-css), which allows you to load styles into your Jest test setup.

> This package can be paired with [jest-transform-css](https://github.com/dferber90/jest-transform-css) and [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) to enable Visual Regression Testing in Jest. See [jest-transform-css](https://github.com/dferber90/jest-transform-css) for more information.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Usage in Jest & React](#usage-in-jest---react)
- [API](#api)
  - [`generateImage(options)`](#-generateimage-options--)
    - [Options](#options)
      - [`options.launch`](#-optionslaunch-)
      - [`options.screenshot`](#-optionsscreenshot-)
      - [`options.serve`](#-optionsserve-)
      - [`options.debug`](#-optionsdebug-)
      - [`options.viewport`](#-optionsviewport-)
      - [`options.waitUntilNetworkIdle`](#-optionswaituntilnetworkidle-)
      - [`options.intercept`](#-optionsintercept-)
    - [Changing viewport](#changing-viewport)
  - [`setDefaultOptions(options)`](#-setdefaultoptions-options--)
  - [`restoreDefaultOptions()`](#-restoredefaultoptions---)
  - [`debug(element)`](#-debug-element--)
- [How it works](#how-it-works)
  - [High level](#high-level)
  - [Technically](#technically)
- [Performance](#performance)
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

## Usage in Jest & React

It is recommended to use this package with [`jest-image-snapshot`](https://www.npmjs.com/package/jest-image-snapshot) and [`react-testing-library`](https://github.com/kentcdodds/react-testing-library). Use it as together like this:

```js
import React from "react";
import { generateImage, setDefaultOptions } from "jsdom-screenshot";
import { render } from "react-testing-library";
import { SomeComponent } from "<your-code>";

it("should have no visual regressions", async () => {
  render(<SomeComponent />);
  expect(await generateImage()).toMatchImageSnapshot();
});
```

You probably want to use a `setupTestFrameworkScriptFile` like this:

```js
// react-testing-library setup
import "jest-dom/extend-expect";
import "react-testing-library/cleanup-after-each";
// set up visual regression testing
import { toMatchImageSnapshot } from "jest-image-snapshot";
import { setDefaultOptions } from "jsdom-screenshot";

// TravisCI requires --no-sandbox to be able to run the tests
// https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-on-travis-ci
setDefaultOptions({
  launch: { args: process.env.CI === "true" ? ["--no-sandbox"] : [] }
});

// give tests more time as taking screenshots takes a while
jest.setTimeout(10000);

expect.extend({ toMatchImageSnapshot });
```

## Usage in TypeScript

In TypeScript, you can declare the custom jest matcher `toMatchImageSnapshot` like this: 

```
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(): R
    }
  }
}
```

## API

### `generateImage(options)`

`generateImage` is the main function you're going to use to take a screenshot of the JSDOM. It supports these options.

> Tip: You can use `react-testing-library`'s `fireEvent` to get the component into any state before taking the screenshot.

#### Options

```js
options = {
  // Options used to launch Puppeteer (puppeteer.launch(options))
  launch: {},
  // Options used to take a screenshot (puppeteer.screenshot(options))
  screenshot: {},
  // An array of folders containing static files to be served
  serve: ["pubilc", "assets"],
  // Prints the jsdom markup to the console before taking the screenshot
  debug: true,
  // Wait for resources to be loaded before taking the screenshot
  waitUntilNetworkIdle: false,
  // Shortcut to set launch.defaultViewport
  viewport: {},
  // Enables request interception
  intercept: () => {}
};
```

##### `options.launch`

`launch` options are passed to `puppeteer.launch([options])`, see [`docs`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunch).

##### `options.screenshot`

`screenshot` options are passed to `page.screenshot([options])`, see [`docs`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions).

##### `options.serve`

`serve` is an array of strings. You can provide a list of folders to serve statically. This is useful when your component uses assets through relative links like `<img src="/party-parrot.gif" />`.

In this case, you could provide `serve: ["images"]` when the `images` folder at the root of your project (where you launch the tests from) contains `party-parrot.gif`.

##### `options.debug`

Prints the jsdom markup to the console before taking the screenshot.

See the [Debugging JSDOM](#debugging-jsdom) section below for more information.

##### `options.viewport`

This is a shortcut to set `options.launch.defaultViewport`. `options.launch.defaultViewport` will take precedence in case both are passed.

##### `options.waitUntilNetworkIdle`

When set to `true`, `jsdom-screenshot` will wait until the network becomes idle (all resources are loaded) before taking a screenshot.
You can use this to ensure that all resources are loaded before the screenshot is taken.

It is disabled by default as it adds roughly one second to each screenshot. Use it wisely to avoid slowing down tests unnecessarily. You can mock requests using [`options.intercept`](#-optionsintercept-).

##### `options.intercept`

When provided, `puppeteer`'s request interception will be enabled. The provided function will be called with the intercepted request.

Activating request interception enables [`request.abort`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestaborterrorcode), [`request.continue`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestcontinueoverrides) and [`request.respond`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestrespondresponse) methods. This provides the capability to modify network requests that are made by a page.

This can be used to speed up tests by stubbing requests.

```js
generateImage({
  intercept: request => {
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

See [`page.setintercept`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetinterceptvalue) of `puppeteer`.

#### Changing viewport

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

### `setDefaultOptions(options)`

Having to reapply the same options for every test is pretty inconvenient. The `setDefaultOptions` function can be used to set default options for every `generateImage` call. Any `options` passed to the `generateImage` call will get merged with the specified `defaultOptions`.

This function can be used to provide global defaults. Note that these defaults are global for all `generateImage` calls. You should typically only call `setDefaultOptions` once in your test-setup file.

For example with Jest, you could do the following in your `setupTestFrameworkScriptFile` file:

```js
import { setDefaultOptions } from "jsdom-screenshot";

/*
  TravisCI requires --no-sandbox to be able to run the tests.
  We the launch options globally here so that they don't need to be
  repeated for every `generateImage` call.
*/
setDefaultOptions({
  launch: { args: process.env.CI === "true" ? ["--no-sandbox"] : [] }
});
```

### `restoreDefaultOptions()`

The `restoreDefaultOptions` function restores the default options provided by `jsdom-screenshot`. See `setDefaultOptions` for a usage example.

### `debug(element)`

Logs the JSDOM contents to the console. See [Debugging](#debugging) for more information.

## How it works

### High level

[`jsdom`](https://github.com/jsdom/jsdom) is an emulator of a subset of browser features. `jsdom` does not have the capability to render visual content, and will act like a headless browser by default. `jsdom` does not do any layout or rendering [ref](https://github.com/jsdom/jsdom#pretending-to-be-a-visual-browser). We use `jsdom` to obtain the state of the HTML which we want to take a screenshot of. Consumers can use `jsdom` to easily get components into the state they want to take a screenshot of. `jsdom-screenshot` then uses the markup ("the HTML") at that moment (of that state). `jsdom-screenshot` launches a local webserver and serves the obtained markup as `index.html`. It further serves assets provided through `serve` so that local assets are loaded. Then `jsdom-screenshot` uses [`puppeteer`](https://github.com/googlechrome/puppeteer/) to take a screenshot take screenshots of that page using headless Google Chrome.

### Technically

The `generateImage` function reads the whole markup of `jsdom` using `document.documentElement.outerHTML`.

It then starts a local webserver on a random open port to serve the obtained markup as as `index.html`.

Once the server is read, it launches a [`puppeteer`](https://github.com/googlechrome/puppeteer/) instance and opens that `index.html` page.
It waits until all resources are loaded (the network becomes idle) before taking a screenshot.

It then returns that screenshot.

## Performance

Launching `puppeteer` to take a screenshot takes around 750ms. The rest depends on your application. You should try to mock/stub network requests to keep tests fast (see [`options.intercept`](#-optionsintercept-)).

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
