const { Location } = require('../dist/index');

/**
 * Open-Dome Location API Test/Demo
 * NOTE: This script is intended for browser environments.
 * In a Node.js environment, it will throw a 'navigator is not defined' error.
 */

async function demoLocation() {
  console.log("📍 Location API Demo Starting...");

  try {
    // 1. Check Permission
    const permission = await Location.checkPermission();
    console.log("Current Permission Status:", permission);

    // 2. Get Current Position
    console.log("Fetching current position...");
    const pos = await Location.getCurrentPosition({ enableHighAccuracy: true });
    console.log("Position:", pos);

    // 3. Watch Position
    const watchId = Location.watchPosition(
      (newPos) => console.log("New Position:", newPos),
      (err) => console.error("Watch Error:", err.message)
    );

    // Clear watch after 10 seconds for demo
    setTimeout(() => {
        Location.clearWatch(watchId);
        console.log("Watch cleared.");
    }, 10000);

  } catch (e) {
    console.log("Location Demo Result (Node.js expected behavior):", e.message);
  }
}

demoLocation();
