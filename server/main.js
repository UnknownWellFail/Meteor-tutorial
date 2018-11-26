import { Meteor } from 'meteor/meteor';

import '../imports/api/tasks.js';


if (Meteor.isServer) {
  Accounts.onCreateUser((options, user) => {
    if (user.services.google) {
      user.username = user.services.google.email;
    }
    return user;
  });
  Meteor.publish(null, function () {
    if (this.userId) {
      const projection = {
        'services.google.id': 1
      };
      return Meteor.users.find(
        { _id: this.userId },
        { fields: projection } );
    } else {
      return null;
    }
  });
}