require('dotenv').config();
const axios = require('axios');

async function main() {
  // First login to get token
  const loginRes = await axios.post('http://[::1]:3000/api/auth/login', {
    email: 'vothanhnha26@gmail.com',
    password: 'nhacc123@'
  });
  
  const token = loginRes.data?.data?.accessToken;
  if (!token) {
    console.error("No token:", loginRes.data);
    return;
  }

  console.log("Got token, now updating autolist...");

  const autoListId = "1df309e5-31c5-4373-97b4-e868a3f92e12";
  const payload = {
    name: "New autolist 1",
    targetPlatforms: "FACEBOOK",
    scheduleType: "INTERVAL",
    intervalMinutes: 1,
    specificTimes: null,
    activeDays: "Mo,Tu,We,Th,Fr,Sa,Su",
    loopEnabled: true,
    isActive: true,
    metadata: JSON.stringify({})
  };

  console.log("Sending payload:", JSON.stringify(payload, null, 2));

  try {
    const updateRes = await axios.put(
      `http://[::1]:3000/api/auto-lists/${autoListId}`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Update response status:", updateRes.status);
    console.log("loopEnabled in response:", updateRes.data?.data?.loopEnabled);
  } catch (err) {
    console.error("Update error:", err.response?.data || err.message);
  }
}

main().catch(console.error);
