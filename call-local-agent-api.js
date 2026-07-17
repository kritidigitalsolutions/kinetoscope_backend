require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const jwt = require('jsonwebtoken');

async function test() {
  try {
    // Generate JWT token directly
    const agentId = '6a548cb649563c5451dd73cb'; // Amit Kumar
    const token = jwt.sign(
      { id: agentId, role: 'agent' },
      process.env.JWT_SECRET || 'kfpl_super_secure_jwt_secret_key_2026',
      { expiresIn: '30d' }
    );

    console.log('Token signed successfully.');

    // Now call client details endpoint on local port 5000 using native fetch
    console.log('Calling getAgentClientById endpoint on local server...');
    const res = await fetch('http://localhost:5000/api/agent/clients/6a464e2aca6673a6be3ef57e', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log('\n--- LOCAL API RESPONSE STATUS:', res.status);
    console.log('--- LOCAL API RESPONSE DATA ---');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error message:', err.message);
  }
}

test();
