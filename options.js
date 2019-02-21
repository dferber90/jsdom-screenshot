const merge = require("lodash.merge");

const defaultOptionsTemplate = {
  waitUntilNetworkIdle: false,
  launch: {},
  screenshot: undefined,
  serve: []
};

let defaultOptions = defaultOptionsTemplate;

const addArg = (opts, arg) => {
  // eslint-disable-next-line no-param-reassign
  if (!Array.isArray(opts.launch.args)) opts.launch.args = [];

  if (!opts.launch.args.includes(arg)) {
    opts.launch.args.push(arg);
  }
};

module.exports.setDefaultOptions = options => {
  defaultOptions = merge({}, defaultOptionsTemplate, options);
};

module.exports.restoreDefaultOptions = () => {
  defaultOptions = defaultOptionsTemplate;
};

module.exports.getMergedOptions = options => {
  const opts = merge({}, defaultOptions, options);

  // If user provided target element we mark it so we can then query its offset in puppeteer
  if (options.target) {
    options.target.setAttribute("data-jsdom-screenshot-target", "");
  }

  // config sugar to let users specify viewport directly
  if (options && options.viewport && !opts.launch.defaultViewport) {
    opts.launch.defaultViewport = options.viewport;
  }

  if (!Array.isArray(opts.serve)) {
    throw new Error("jsdom-screenshot: options.serve must be an array");
  }

  // Disable "lcd text antialiasing" to avoid differences in the snapshots
  // depending on the used monitor.
  // See https://github.com/dferber90/jsdom-screenshot/issues/1
  addArg(opts, "--disable-lcd-text");

  return opts;
};
