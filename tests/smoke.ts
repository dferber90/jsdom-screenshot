import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { generateImage } from '../src/generateImage';

const dom = new JSDOM(
  `<!DOCTYPE html><div id="hello-world" style="background-color: blue; width: 50px; height: 50px;"></div>`
);

const { window } = dom;

// this creates a "global" document variable
const { document } = window;

global.document = document;

// set this to "true" to write new screenshots.
// Don't forget to set it back to false afterwards
const updateScreenshots = false;

if (updateScreenshots) {
  console.log('Not running tests. Updating screenshots instead');
}

(async () => {
  const image = (await generateImage()) as Buffer;
  if (updateScreenshots) {
    fs.writeFileSync(path.join(__dirname, 'smoke.png'), image);
    return;
  }
  const expectedImage = fs.readFileSync(path.join(__dirname, 'smoke.png'));
  const comparisonResult = image.compare(expectedImage);
  const isSame = comparisonResult === 0;
  if (!isSame) {
    throw new Error('images-not-equal');
  }
  process.exit(isSame ? 0 : 1);
})();

(async () => {
  const image = (await generateImage({ targetSelector: '#hello-world' })) as Buffer;
  if (updateScreenshots) {
    fs.writeFileSync(path.join(__dirname, 'smoke-clipped.png'), image);
    return;
  }
  const expectedImage = fs.readFileSync(path.join(__dirname, 'smoke-clipped.png'));
  const comparisonResult = image.compare(expectedImage);
  const isSame = comparisonResult === 0;
  if (!isSame) {
    throw new Error('clipped-images-not-equal');
  }
  process.exit(isSame ? 0 : 1);
})();
