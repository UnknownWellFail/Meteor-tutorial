import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import '../imports/api/tasks.js';
import '../imports/api/lists.js';
import { Lists } from '../imports/api/lists.js';
import { addStatCron } from '../imports/api/helpers/stat-cron';

Meteor.startup( () => {
  process.env.MAIL_URL = Meteor.settings.MAIL_URL;
  addStatCron();
});

if (Meteor.isServer) {
  Accounts.onCreateUser( (options, user) => {
    if (user.services.google) {
      user.username = user.services.google.email;
      user.emails = user.services.google.email;
    }
    Lists.insert({
      name: 'My Tasks',
      owner: user._id,
      username: user.username,
    });

    return user;
  });
  /* eslint-disable*/
  Meteor.publish('users.me', function () {
    if (!this.userId) {
      return this.ready();
    }
    const projection = {
      'services.google.id': 1
    };
    return Meteor.users.find(
      { _id: this.userId },
      { fields: projection });
  });
  /* eslint-enable*/
}