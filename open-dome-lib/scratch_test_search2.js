const { Events } = require('./dist/events.js');

const results = Events.search({ query: 'giants', from: Date.now() });
console.log("Query 'giants' + UPCOMING:", results.length, "matches");
results.forEach(r => console.log(`- ${r.title} (${r.placeName})`));
