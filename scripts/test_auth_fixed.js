// Simple test script for register -> login flow against local dev server
// Usage: node scripts/test_auth_fixed.js

(async () => {
  const base = "http://127.0.0.1:3001";
  try {
    const regRes = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "autotest+1@example.com",
        password: "Password123!",
        firstName: "Auto",
        lastName: "Tester",
        phone: "",
        role: "customer",
      }),
    });
    const regBody = await regRes.text();
    console.log("REGISTER STATUS", regRes.status);
    console.log(regBody);
  } catch (e) {
    console.error("Register error", e.message);
  }

  try {
    const loginRes = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "autotest+1@example.com",
        password: "Password123!",
      }),
    });
    const loginBody = await loginRes.text();
    console.log("LOGIN STATUS", loginRes.status);
    console.log(loginBody);
  } catch (e) {
    console.error("Login error", e.message);
  }
})();
