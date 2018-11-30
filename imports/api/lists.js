import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http'


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
      check(name, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      Lists.remove({
        _id: listId,
        owner: this.userId
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