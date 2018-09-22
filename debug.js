// copied from
// https://github.com/kentcdodds/dom-testing-library/blob/2397f644667bc6e65b9becfa8c1615eb285c7673/src/pretty-dom.js
const prettyFormat = require("pretty-format");

const { DOMElement, DOMCollection } = prettyFormat.plugins;

function prettyDOM(htmlElement, maxLength, options) {
  if (htmlElement.documentElement) {
    htmlElement = htmlElement.documentElement;
  }

  const debugContent = prettyFormat(htmlElement, {
    plugins: [DOMElement, DOMCollection],
    printFunctionName: false,
    highlight: true,
    ...options
  });
  return maxLength !== undefined && htmlElement.outerHTML.length > maxLength
    ? `${debugContent.slice(0, maxLength)}...`
    : debugContent;
}

module.exports = (el = document) => console.log(prettyDOM(el));
