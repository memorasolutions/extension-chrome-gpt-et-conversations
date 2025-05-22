const { ChatGPTScraper } = require('../content.js');
const scraper = new ChatGPTScraper();
function assert(cond, msg) { if (!cond) throw new Error(msg); }
assert(scraper.filterFallbackName('Today') === '', 'Today should be ignored');
assert(scraper.filterFallbackName('Hier') === '', 'Hier should be ignored');
assert(scraper.filterFallbackName('12/01/23') === '', 'Date should be ignored');
assert(scraper.filterFallbackName('My GPT') === 'My GPT', 'Normal name');
console.log('Tests passed');
