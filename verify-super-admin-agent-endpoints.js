require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const jwt = require('jsonwebtoken');

async function test() {
  try {
    // Generate JWT token for agent
    const agentId = '6a548cb649563c5451dd73cb'; // Amit Kumar
    const token = jwt.sign(
      { id: agentId, role: 'agent' },
      process.env.JWT_SECRET || 'kfpl_super_secure_jwt_secret_key_2026',
      { expiresIn: '30d' }
    );

    console.log('Token signed successfully.');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const roiUrl = 'http://127.0.0.1:5000/api/super-admin/clients/6a464e2aca6673a6be3ef57e/roi';

    console.log('\n--- TESTING GET /api/super-admin/clients/:id/roi ---');
    const res = await fetch(roiUrl, { headers });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Full ROI Response:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
