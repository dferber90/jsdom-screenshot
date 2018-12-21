// copied from
// https://github.com/kentcdodds/dom-testing-library/blob/2397f644667bc6e65b9becfa8c1615eb285c7673/src/pretty-dom.js
const prettyFormat = require("pretty-format");

const { DOMElement, DOMCollection } = prettyFormat.plugins;

function prettyDOM(htmlElement, maxLength, options) {
  if (htmlElement.documentElement) {
    // eslint-disable-next-line no-param-reassign
    htmlElement = htmlElement.documentElement;
  }

  const debugContent = prettyFormat(
    htmlElement,
    Object.assign(
      {
        plugins: [DOMElement, DOMCollection],
        printFunctionName: false,
        highlight: true
      },
      options
    )
  );
  return maxLength !== undefined && htmlElement.outerHTML.length > maxLength
    ? `${debugContent.slice(0, maxLength)}...`
    : debugContent;
}

// eslint-disable-next-line no-console
module.exports = (el = document) => console.log(prettyDOM(el));
