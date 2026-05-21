/**
 * Open-Dome Location SDK
 * Simple abstraction over navigator.geolocation for cohort teams.
 */

export class LocationAPI {
  /**
   * Get the current user position as a Promise.
   * @param {Object} options - PositionOptions (enableHighAccuracy, timeout, maximumAge)
   * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
   */
  async getCurrentPosition(options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }) {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
    
    if (!geo) {
      throw new Error("Geolocation is not supported by this browser.");
    }

    return new Promise((resolve, reject) => {
      geo.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(new Error(this._getErrorMessage(error)));
        },
        options
      );
    });
  }

  /**
   * Watch the user position and execute a callback on change.
   * @param {Function} callback - Success callback
   * @param {Function} errorCallback - Error callback
   * @param {Object} options - PositionOptions
   * @returns {number} - Watch ID (use to clear watch)
   */
  watchPosition(callback, errorCallback, options = { enableHighAccuracy: true }) {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;

    if (!geo) {
      throw new Error("Geolocation is not supported by this browser.");
    }

    return geo.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        callback({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        if (errorCallback) errorCallback(new Error(this._getErrorMessage(error)));
      },
      options
    );
  }

  /**
   * Stop watching the position.
   * @param {number} watchId - The ID returned by watchPosition
   */
  clearWatch(watchId) {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
    if (geo) {
      geo.clearWatch(watchId);
    }
  }

  /**
   * Check if geolocation permission has been granted.
   * @returns {Promise<string>} - 'granted', 'denied', or 'prompt'
   */
  async checkPermission() {
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : null;
    
    if (!permissions || !permissions.query) {
      return 'unknown';
    }

    try {
      const status = await permissions.query({ name: 'geolocation' });
      return status.state;
    } catch (e) {
      return 'unknown';
    }
  }

  _getErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "User denied the request for Geolocation.";
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable.";
      case error.TIMEOUT:
        return "The request to get user location timed out.";
      case error.UNKNOWN_ERROR:
        return "An unknown error occurred.";
      default:
        return error.message;
    }
  }
}

export const Location = new LocationAPI();
