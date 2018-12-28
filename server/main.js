import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import aws from 'aws-sdk';
import dotenv from 'dotenv';

import '../imports/api/tasks.js';
import '../imports/api/lists.js';
import '../imports/api/payments.js';
import { Lists } from '../imports/api/lists.js';
import { addStatCron } from '../imports/api/helpers/stat-cron';
import { setS3 } from '../imports/api/aws-conf';

dotenv.config({ path: process.env.PWD + "/.env" });

aws.config.update({
  secretAccessKey: process.env.ACCESS_SECRET_KEY,
  accessKeyId: process.env.ACCESS_KEY_ID,
  region: 'us-east-1',
});

Meteor.startup( () => {
  addStatCron();
  setS3();
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