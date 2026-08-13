const { Events } = require('../dist/index');

/**
 * Open-Dome Events API Test (Notice Board)
 * This script demonstrates connecting to the MQTT broker and subscribing to events.
 */

async function runEventsTest() {
  console.log("📢 Starting Events API Test...");

  const config = {
    host: 'mqtt.effisend.dpdns.org',
    port: 443,
    protocol: 'wss', // Secure WebSocket for port 443
    username: 'SuperSecretClient*',
    password: 'SuperSecretPassword*'
  };

  try {
    // 1. Connect
    Events.connect(config);

    // 2. Subscribe to a topic (e.g., 'opendome/notices')
    Events.subscribe('opendome/notices', (data, topic) => {
      console.log(`\n🔔 NEW EVENT on [${topic}]:`, data);
    });

    // 3. Publish a test event
    setTimeout(() => {
        console.log("\n🚀 Publishing test notice...");
        Events.publish('opendome/notices', {
            title: "Welcome to OpenDome",
            content: "Real-time notice board is now active!",
            timestamp: new Date().toISOString()
        });
    }, 2000);

    // Keep script alive for 10 seconds to receive messages
    setTimeout(() => {
        console.log("\n🛑 Closing connection...");
        Events.disconnect();
        process.exit(0);
    }, 12000);

  } catch (error) {
    console.error("❌ Events API Error:", error.message);
    process.exit(1);
  }
}

runEventsTest();
