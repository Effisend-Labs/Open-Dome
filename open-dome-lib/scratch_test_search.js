const { Events } = require('./dist/events.js');

const results = Events.search({ query: 'giants' });
console.log("Query 'giants':", results.length, "matches");
results.forEach(r => console.log(`- ${r.title} (${r.placeName})`));

const results2 = Events.search({ category: 'Baseball' });
console.log("\nCategory 'Baseball':", results2.length, "matches");

const results3 = Events.search({ placeName: 'Tokyo Dome' });
console.log("\nPlace 'Tokyo Dome':", results3.length, "matches");

const results4 = Events.search({ from: Date.now() });
console.log("\nUpcoming (from now):", results4.length, "matches");
