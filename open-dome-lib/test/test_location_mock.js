/**
 * Mocking the browser Geolocation API for Node.js testing
 */
function mockGeolocation() {
  global.navigator = {
    geolocation: {
      getCurrentPosition: (success) => {
        setTimeout(() => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 10
            },
            timestamp: Date.now()
          });
        }, 100);
      },
      watchPosition: (success) => {
        const id = setInterval(() => {
          success({
            coords: {
              latitude: 40.7128 + Math.random() * 0.001,
              longitude: -74.0060 + Math.random() * 0.001,
              accuracy: 5
            },
            timestamp: Date.now()
          });
        }, 1000);
        return id;
      },
      clearWatch: (id) => clearInterval(id)
    },
    permissions: {
      query: async (queryObj) => {
        if (queryObj.name === 'geolocation') {
          return { state: 'granted' };
        }
        return { state: 'denied' };
      }
    }
  };
}

mockGeolocation(); // Initialize mock BEFORE requiring SDK

const { Location } = require('../dist/index');

async function runLocationTest() {
  console.log("🧪 Starting Location API Mock Test...");

  try {
    // 1. Test Permission Check
    const permission = await Location.checkPermission();
    console.log("✅ Permission Status:", permission);
    if (permission !== 'granted') throw new Error("Permission check failed");

    // 2. Test Get Current Position
    console.log("Fetching current position...");
    const pos = await Location.getCurrentPosition();
    console.log("✅ Current Position:", pos);
    if (pos.latitude !== 40.7128) throw new Error("Latitude mismatch");

    // 3. Test Watch Position
    console.log("Starting position watch (3 seconds)...");
    let updateCount = 0;
    const watchId = Location.watchPosition((newPos) => {
      updateCount++;
      console.log(`📡 Update #${updateCount}:`, newPos.latitude.toFixed(6), newPos.longitude.toFixed(6));
    });

    await new Promise(resolve => setTimeout(resolve, 3500));
    
    Location.clearWatch(watchId);
    console.log(`✅ Watch finished. Received ${updateCount} updates.`);
    if (updateCount < 3) throw new Error("Watch did not receive enough updates");

    console.log("\n✨ Location API Mock Test Passed Successfully! ✨");

  } catch (e) {
    console.error("\n❌ Location Test Failed:", e.message);
    process.exit(1);
  }
}

runLocationTest();
