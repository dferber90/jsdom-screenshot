import prettyFormat, { OptionsReceived } from 'pretty-format';

export function debug(el: Document | HTMLElement = document) {
  return console.log(prettyDOM(el));
}

// adapted from
// https://github.com/kentcdodds/dom-testing-library/blob/2397f644667bc6e65b9becfa8c1615eb285c7673/src/pretty-dom.js
function prettyDOM(element: Document | HTMLElement, maxLength?: number, options?: OptionsReceived) {
  const { DOMElement, DOMCollection } = prettyFormat.plugins;

  let htmlElement: HTMLElement;

  if (isDocument(element)) {
    htmlElement = element.documentElement;
  } else {
    htmlElement = element;
  }

  const debugContent = prettyFormat(htmlElement, {
    plugins: [DOMElement, DOMCollection],
    printFunctionName: false,
    highlight: true,
    ...options,
  });

  return maxLength !== undefined && htmlElement.outerHTML.length > maxLength
    ? `${debugContent.slice(0, maxLength)}...`
    : debugContent;
}

function isDocument(element: Document | HTMLElement): element is Document {
  return Object.keys(element).includes('documentElement');
}
