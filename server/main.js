import { Meteor } from 'meteor/meteor';

import '../imports/api/tasks.js';


if (Meteor.isServer) {
  Accounts.onCreateUser((options, user) => {
    if (user.services.google) {
      user.username = user.services.google.email;
    }
    return user;
  });
  Meteor.publish('users.me', function () {
    if (!this.userId) return this.ready();
    const projection = {
      'services.google.id': 1
    };
    return Meteor.users.find(
      { _id: this.userId },
      { fields: projection });
  });
}