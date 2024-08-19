const mongoose = require('mongoose');
const Community = require('./models/Community');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateCommunities() {
  try {
    const communities = await Community.find({});
    for (let community of communities) {
      // Remove security question and answer
      community.securityQuestion = undefined;
      community.securityAnswer = undefined;

      // Generate invite code if not present
      if (!community.inviteCode) {
        community.inviteCode = await Community.generateInviteCode();
      }

      await community.save();
      console.log(`Updated community: ${community._id}`);
    }
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrateCommunities();