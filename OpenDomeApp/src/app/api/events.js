import eventsData from './dbs/events.json';

/**
 * Open-Dome Events SDK (Query API)
 * Provides local database query capabilities to filter and search historical events.
 */
export class EventsAPI {
  constructor() {
    this.events = eventsData || [];
  }

  /**
   * Helper to resolve Date object, ISO string, or timestamp into a numeric timestamp.
   * @private
   */
  _toTimestamp(val) {
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }

  /**
   * Get all loaded events from the database.
   * @returns {Array} List of all events
   */
  getAll() {
    return this.events;
  }

  /**
   * Retrieve a single event by its ID.
   * @param {number|string} id - Event ID
   * @returns {Object|null} Matching event or null
   */
  getById(id) {
    const numericId = Number(id);
    if (isNaN(numericId)) return null;
    return this.events.find(event => event.id === numericId) || null;
  }

  /**
   * Search events based on search criteria.
   * @param {Object} criteria - Search options
   * @param {string} [criteria.query] - Text query to match title, title_ja, placeName, or category (case-insensitive)
   * @param {string} [criteria.category] - Filter by category (case-insensitive, exact match)
   * @param {string} [criteria.placeName] - Filter by placeName (case-insensitive, exact match)
   * @param {Date|number|string} [criteria.from] - Start range limit for event 'from' timestamp
   * @param {Date|number|string} [criteria.to] - End range limit for event 'to' timestamp
   * @param {number} [criteria.limit] - Max number of results to return
   * @param {number} [criteria.offset] - Offset for pagination
   * @returns {Array} Filtered list of events
   */
  search(criteria = {}) {
    let results = [...this.events];

    const { query, category, placeName, from, to, limit, offset } = criteria;

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(event => 
        (event.title && event.title.toLowerCase().includes(lowerQuery)) ||
        (event.title_ja && event.title_ja.toLowerCase().includes(lowerQuery)) ||
        (event.placeName && event.placeName.toLowerCase().includes(lowerQuery)) ||
        (event.category && event.category.toLowerCase().includes(lowerQuery))
      );
    }

    if (category) {
      const lowerCat = category.toLowerCase();
      results = results.filter(event => 
        event.category && event.category.toLowerCase() === lowerCat
      );
    }

    if (placeName) {
      const lowerPlace = placeName.toLowerCase();
      results = results.filter(event => 
        event.placeName && event.placeName.toLowerCase() === lowerPlace
      );
    }

    if (from !== undefined) {
      const fromTs = this._toTimestamp(from);
      if (fromTs !== null) {
        results = results.filter(event => (event.from || 0) >= fromTs);
      }
    }

    if (to !== undefined) {
      const toTs = this._toTimestamp(to);
      if (toTs !== null) {
        results = results.filter(event => (event.to || 0) <= toTs);
      }
    }

    // Default chronological sorting (oldest to newest)
    results.sort((a, b) => (a.from || 0) - (b.from || 0));

    if (offset !== undefined) {
      results = results.slice(offset);
    }

    if (limit !== undefined) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Search for events that overlap with a specific date range.
   * @param {Date|number|string} start - Start date/time of the range
   * @param {Date|number|string} end - End date/time of the range
   * @returns {Array} List of overlapping events
   */
  getByDateRange(start, end) {
    const startTs = this._toTimestamp(start);
    const endTs = this._toTimestamp(end);
    if (startTs === null || endTs === null) return [];

    return this.events.filter(event => {
      const fromTs = event.from || 0;
      const toTs = event.to || fromTs;
      return fromTs <= endTs && toTs >= startTs;
    }).sort((a, b) => (a.from || 0) - (b.from || 0));
  }

  /**
   * Retrieve all events occurring or overlapping in a specific month of a year.
   * @param {number|string} year - Calendar year (e.g. 2027)
   * @param {number|string} month - Calendar month (1-indexed, e.g. 2 for February)
   * @returns {Array} Matching events
   */
  getByMonth(year, month) {
    const y = Number(year);
    const m = Number(month);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return [];

    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 1).getTime() - 1;

    return this.getByDateRange(start, end);
  }

  /**
   * Retrieve all events occurring or overlapping in a specific calendar year.
   * @param {number|string} year - Calendar year (e.g. 2027)
   * @returns {Array} Matching events
   */
  getByYear(year) {
    const y = Number(year);
    if (isNaN(y)) return [];

    const start = new Date(y, 0, 1).getTime();
    const end = new Date(y + 1, 0, 1).getTime() - 1;

    return this.getByDateRange(start, end);
  }

  /**
   * Retrieve events occurring on a specific month and day across any year.
   * Useful for finding anniversary-like events or seasonal occurrences.
   * @param {number|string} month - Calendar month (1-indexed, 1-12)
   * @param {number|string} day - Day of the month (1-31)
   * @returns {Array} Matching events
   */
  getByDayAndMonth(month, day) {
    const m = Number(month);
    const d = Number(day);
    if (isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return [];

    const targetMonth0 = m - 1; // 0-indexed month for javascript Date

    return this.events.filter(event => {
      if (event.from) {
        const fromD = new Date(event.from);
        if (fromD.getMonth() === targetMonth0 && fromD.getDate() === d) return true;
      }
      if (event.to) {
        const toD = new Date(event.to);
        if (toD.getMonth() === targetMonth0 && toD.getDate() === d) return true;
      }
      return false;
    }).sort((a, b) => (a.from || 0) - (b.from || 0));
  }
}

export const Events = new EventsAPI();
