# Changes Log

This file tracks all changes made to `open-dome-lib` during this session to facilitate updating other documents later.

## Implemented Changes

### Refactoring Events API into Communication and Event Query APIs
- **Renamed MQTT Events API to Communication API**:
  - Moved broker connection and real-time messaging logic from `events.js` into the new `src/communication.js` file.
  - Renamed the API class to `CommunicationAPI` and exported its singleton instance as `Communication`.
- **Converted Events API to Local Query API**:
  - Repurposed `src/events.js` to import and query event records from `src/dbs/events.json`.
  - Implemented core search methods: `getAll()`, `getById(id)`, and `search(criteria)` supporting text matching, category, place, and timestamp range filtering.
  - Added new dedicated date query helper methods to easily search and retrieve events:
    - `getByDateRange(start, end)`: Finds events that occur/overlap within a start and end range (supports Date objects, numeric timestamps, or ISO strings).
    - `getByMonth(year, month)`: Finds all events in a specific year and month (1-indexed month parameter).
    - `getByYear(year)`: Finds all events occurring within a calendar year.
    - `getByDayAndMonth(month, day)`: Finds events starting/ending on a specific day of the month across any year (great for recurring events/anniversaries).
- **Export Configuration Updates**:
  - Updated `src/index.js` to export `./communication` alongside the rest of the module exports.
  - Updated `src/useOpenDome.js` hook to import and return `Communication` in the SDK interface alongside `Events`.
- **Build Step Updates**:
  - Added `--copy-files` to the Babel compile script in `package.json` to ensure the local JSON database `dbs/events.json` is copied into the `dist/` directory during compilation.
