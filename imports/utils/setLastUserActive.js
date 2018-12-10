import { Meteor } from 'meteor/meteor';

const setLastUserActive = userId => {
  Meteor.users.update(userId,{ $set: { lastActiveAt: new Date() } }) ;
};

export default setLastUserActive;