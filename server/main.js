import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { SyncedCron } from 'meteor/percolate:synced-cron';

import '../imports/api/tasks.js';
import '../imports/api/lists.js';
import { Lists } from '../imports/api/lists.js';
import { addStatCron } from './cron/stat-cron';

Meteor.startup( ()=> {
  process.env.MAIL_URL = "smtp://mctestemail@yandex.ru:mctestemailpassword@smtp.yandex.ru:587/";
  addStatCron();
  SyncedCron.start();
});

if (Meteor.isServer) {
  Accounts.onCreateUser( (options, user) => {
    if (user.services.google) {
      user.username = user.services.google.email;
      user.email = user.services.google.email;
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