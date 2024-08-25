const mongoose = require('mongoose');
const User = require('./models/User');
const Community = require('./models/Community');
require('dotenv').config();

mongoose.connect("mongodb+srv://loli:loli@loli.fqm5x.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function findAllUsersWithCommunities() {
  try {
    const users = await User.find().populate('communities');
    users.forEach((user, index) => {
      console.log('User:', JSON.stringify(user, null, 2));
      console.log('\nCommunities:');
      user.communities.forEach(community => {
        console.log(JSON.stringify(community, null, 2));
      });
      if (index < users.length - 1) {
        console.log('\n' + '-'.repeat(50) + '\n');
      }
    });
    return users;
  } catch (error) {
    console.error('Error finding users:', error);
  }
}

// Commented out deletion code
/*
async function deleteUser(userId) {
  try {
    // Delete user
    await User.findByIdAndDelete(userId);

    // Remove user from all communities
    await Community.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    console.log(`User ${userId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}
*/

// Execute the function
findAllUsersWithCommunities().then(() => {
  mongoose.disconnect();
});