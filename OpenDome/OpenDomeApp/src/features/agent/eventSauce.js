/**
 * Short, human lines for a locked-in show — not catalog metadata.
 */
export function getEventSauce(event) {
  if (!event) return null;

  const cat = String(event.category || '').toLowerCase();
  const title = String(event.title || '');
  const place = String(event.placeName || 'Tokyo Dome City');
  const time = event.fromTime ? ` Doors lean toward ${event.fromTime}.` : '';

  if (/baseball/i.test(cat) || /\bvs\b/i.test(title)) {
    return `Game day energy under the big roof at ${place} — batting chatter, beer mist, and that ninth-inning hush.${time}`;
  }
  if (/concert|live|music|tour|cinema/i.test(cat) || /tour|live|cinema|concert/i.test(title)) {
    return `A live night at ${place} — lights drop, phones go up, and the whole dome becomes one room.${time}`;
  }
  if (/wrestl|boxing|martial|kickbox|fight/i.test(cat) || /wrestl|boxing|stardom|noah|ddt|knock/i.test(title)) {
    return `Combat sports under the lights at ${place} — loud crowds, louder entrances, zero chill.${time}`;
  }
  if (/theater|drama|stage|show/i.test(cat)) {
    return `A stage night at ${place} — settle in early, soak the room, then let the story take the floor.${time}`;
  }

  return `A solid anchor for your Tokyo Dome City day — build the morning around it, land here when it counts.${time}`;
}
