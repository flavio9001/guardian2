const https = require('https');

const urls = [
  'https://raw.githubusercontent.com/flavio9001/guardian2/main/api.php',
  'https://raw.githubusercontent.com/flavio9001/guardian2/main/app.js'
];

function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

async function main() {
  for (const url of urls) {
    console.log(`--- Fetching: ${url} ---\n`);
    try {
      const content = await fetchContent(url);
      console.log(content);
      console.log(`\n--- End of ${url.split('/').pop()} ---\n`);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
    }
  }
}

main();