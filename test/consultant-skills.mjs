import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'open-dome-lib/package.json'));
const skills = require('./dist/agentSkills.js');

let passed = 0;
let failed = 0;
function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}${extra ? `  ${extra}` : ''}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${msg}${extra ? `  ${extra}` : ''}`);
  }
}

console.log('\n=== Dome consultant agent-kit skills ===\n');

const events = skills.runDomeConsultantTool('search_events', { placeName: 'Tokyo Dome', limit: 3 });
ok(Array.isArray(events.events) && events.events.length > 0, `search_events (${events.events?.length})`, events.events?.[0]?.title);

const firstId = events.events?.[0]?.id;
const one = skills.runDomeConsultantTool('get_event', { id: firstId });
ok(Boolean(one.event?.title), `get_event #${firstId}`, one.event?.title);

const places = skills.runDomeConsultantTool('list_places');
ok(Array.isArray(places.places) && places.places.length > 0, `list_places (${places.places?.length})`);

const amenities = skills.runDomeConsultantTool('list_amenities', { tag: 'spa' });
ok(Array.isArray(amenities.amenities), `list_amenities spa (${amenities.amenities?.length})`);

const plan = skills.runDomeConsultantTool('plan_day', { eventId: firstId, userText: 'zen day' });
ok(Boolean(plan.title) && Array.isArray(plan.stops) && plan.stops.length > 0, `plan_day`, plan.title);

ok(skills.resolveAgentMode({ mode: 'wallet' }) === 'wallet', 'resolveAgentMode wallet');
ok(skills.resolveAgentMode({ app: 'openagent' }) === 'openagent', 'resolveAgentMode openagent');
ok(skills.resolveAgentMode({}) === 'dome', 'resolveAgentMode default dome');

const circleNames = skills.WALLET_CIRCLE_TOOLS[0].functionDeclarations.map((t) => t.name);
ok(
  circleNames.includes('create_transaction') && circleNames.includes('list_wallets'),
  `WALLET_CIRCLE_TOOLS (${circleNames.length})`,
  circleNames.join(', '),
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
