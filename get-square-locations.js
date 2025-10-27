const https = require("https");

async function getSquareLocations() {
  try {
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: "connect.squareup.com",
        path: "/v2/locations",
        method: "GET",
        headers: {
          Authorization:
            "Bearer EAAAl8OYziRbkZOKTwstUxv_W4H1U_woPKGTZJNidlOASw1zAhdc_LKs5Hb5obzd",
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", reject);
      req.end();
    });

    if (response.locations && response.locations.length > 0) {
      console.log("📍 Available Square Locations:");
      response.locations.forEach((location, index) => {
        console.log(`\n${index + 1}. ${location.name}`);
        console.log(`   Location ID: ${location.id}`);
        console.log(`   Status: ${location.status}`);
        console.log(`   Address: ${location.address?.addressLine1 || "N/A"}`);
        console.log(`   City: ${location.address?.locality || "N/A"}`);
        console.log(
          `   Capabilities: ${location.capabilities?.join(", ") || "N/A"}`
        );
      });

      // Use the first active location as default
      const activeLocation = response.locations.find(
        (loc) => loc.status === "ACTIVE"
      );
      if (activeLocation) {
        console.log(
          `\n🎯 Recommended Location ID for GitHub Secrets: ${activeLocation.id}`
        );
      }
    } else {
      console.log("❌ No locations found in your Square account");
    }
  } catch (error) {
    console.error("❌ Error fetching Square locations:", error.message);
    console.log(
      "\n💡 Make sure your Square account has at least one location set up"
    );
    console.log("💡 Go to: https://squareup.com/dashboard/locations");
  }
}

getSquareLocations();
