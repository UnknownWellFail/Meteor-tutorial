import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Lists = new Mongo.Collection('lists');

export const hasAccessToList = ({ listId, userId, roles }) => {
  const list = Lists.findOne({
    _id: listId,
    $or: [
      { owner: userId },
      { 'users._id': userId }
    ]
  });

  if (!list) throw new Meteor.Error('List not found');

  if (userId === list.owner) return true;

  if (roles) return !!list.users.find(({ _id, role }) => _id === userId && roles.includes(role));
};

if (Meteor.isServer) {
  Meteor.publish('lists', function listsPublconsication() {
    return Lists.find(
      {
        $or: [
          { owner: this.userId },
          {
            'users._id': this.userId
          }]
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

      if (Lists.find({ owner: this.userId }).count() !== 1) {
        throw new Meteor.Error('You can`t remove your last list');
      }

      Lists.remove({
        _id: listId,
        owner: this.userId
      });
      Meteor.call('tasks.remove.list', listId);
    },

    'lists.update'(listId, name) {
      check(listId, String);
      check(name, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      if (name === '') {
        throw new Meteor.Error('Name can`t be empty');
      }

      Lists.update(listId, { $set: { name: name } });
    },
    'lists.invite'(listId, userId, role) {
      check(listId, String);
      check(userId, String);
      check(role, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }


      Lists.update(
        {
          _id: listId
        },
        {
          $push: { users: { _id: userId, role: role } }
        }
      );
    },
  });
}