import merge from 'lodash.merge';
import { JsdomScreenshotOptions } from './types';

const defaultOptionsTemplate: JsdomScreenshotOptions = {
  waitUntilNetworkIdle: false,
  screenshot: undefined,
  launch: {},
  serve: [],
};

let defaultOptions = defaultOptionsTemplate;

export function setDefaultOptions(options: JsdomScreenshotOptions) {
  defaultOptions = merge({}, defaultOptionsTemplate, options);
}

export function restoreDefaultOptions() {
  defaultOptions = defaultOptionsTemplate;
}

export function getMergedOptions(options: JsdomScreenshotOptions) {
  const opts = merge({}, defaultOptions, options);
  applyStandardLaunchArgs(opts);
  applySugar(opts);
  validate(opts);
  return opts;
}

function applyStandardLaunchArgs(opts: JsdomScreenshotOptions) {
  // Disable "lcd text antialiasing" to avoid differences in the snapshots
  // depending on the used monitor.
  // See https://github.com/dferber90/jsdom-screenshot/issues/1
  addArg(opts, '--disable-lcd-text');
}

function applySugar(opts: JsdomScreenshotOptions) {
  // config sugar to let users specify viewport directly
  opts.launch = opts.launch ?? {};
  opts.launch.defaultViewport = opts.launch.defaultViewport ?? opts.viewport;
}

function validate(opts: JsdomScreenshotOptions) {
  if (!Array.isArray(opts.serve)) {
    throw new Error('jsdom-screenshot: options.serve must be an array');
  }
}

function addArg(opts: JsdomScreenshotOptions, arg: string) {
  opts.launch = opts.launch ?? {};
  opts.launch.args = opts.launch.args ?? [];
  if (!opts.launch.args.includes(arg)) {
    opts.launch.args.push(arg);
  }
}
