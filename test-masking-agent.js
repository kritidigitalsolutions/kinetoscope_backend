require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const { maskResponseData } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/utils/fieldMasking');
const { ROLES } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/constants/roles');

const mockUser = {
  role: 'agent',
  id: '6a548cb649563c5451dd73cb'
};

const mockPayload = {
  success: true,
  data: {
    profile: {
      dob: "2002-03-12T00:00:00.000Z",
      address: "48/120 jaipur house\r\nNear Pluse Hospital",
      panNumber: "GHIAD9012N",
      accountNumber: "16840100028967",
      ifscCode: "HDFC0001234",
      riskProfile: "Conservative"
    }
  }
};

const sanitized = maskResponseData(mockPayload, mockUser);
console.log('Sanitized output for AGENT:', JSON.stringify(sanitized, null, 2));
