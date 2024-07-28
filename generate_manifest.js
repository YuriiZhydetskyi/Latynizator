const fs = require('fs');

const baseManifest = JSON.parse(fs.readFileSync('manifest.generic.json', 'utf8'));

// Firefox-specific manifest
const firefoxManifest = {
  ...baseManifest,
  background: {
    scripts: ["lib/transliteration.js", "background.js"],
    type: "module"
  }
};

// Chrome-specific manifest
const chromeManifest = {
  ...baseManifest,
  background: {
    service_worker: "background.js"
  }
};

fs.writeFileSync('manifest.firefox.json', JSON.stringify(firefoxManifest, null, 2));
fs.writeFileSync('manifest.chrome.json', JSON.stringify(chromeManifest, null, 2));

console.log('Manifests generated for Firefox and Chrome.');