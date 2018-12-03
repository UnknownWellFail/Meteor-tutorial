import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Lists = new Mongo.Collection('lists');

if (Meteor.isServer) {
  Meteor.publish('lists', function listsPublconsication() {
    return Lists.find(
      {
        owner: this.userId
      }
    );
  });

  Meteor.methods({
    'lists.create'(name) {
      check(name, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      if (name === '') {
        throw new Meteor.Error('Name can`t be empty');
      }

      Lists.insert({
        name,
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
      });
    },

    'lists.delete'(listId) {
      check(listId, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      return new Promise((resolve, reject) => {
        if (Lists.find({ owner: this.userId }).count() !== 1) {
          Lists.remove({
            _id: listId,
            owner: this.userId
          });
          Meteor.call('tasks.remove.list',listId);
          resolve();
        } else {
          reject();
        }
      });

    },

    'lists.update'(listId) {
      check(name, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

    }
  });
}