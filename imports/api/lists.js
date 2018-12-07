import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

import { getTodayDate } from '../utils/utils';

export const Lists = new Mongo.Collection('lists');

export const getListName = listId => {
  const list = Lists.findOne(listId);
  if(list) {
    return list.name;
  }
};

export const createdToday = ({ listsIds }) => {
  const date = getTodayDate();

  const count = Lists.find(
    {
      _id: { $in: listsIds },
      createdAt: { $gte: date.start, $lt: date.end },
    }
  ).count();

  return count;
};

export const hasAccessToList = ({ listId, userId, roles }) => {
  if(!listId){
    return true;
  }

  const list = Lists.findOne({
    _id: listId,
    $or: [
      { owner: userId },
      { 'users._id': userId }
    ]
  });

  if (!list) {
    throw new Meteor.Error('List not found');
  }
  if (userId === list.owner) {
    return true;
  }
  if (roles) {
    return !!list.users.find( ({ _id, role }) => _id === userId && roles.includes(role) );
  }
};

if (Meteor.isServer) {
  Meteor.publish('lists', function listsPublconsication() {
    return Lists.find(
      {
        $or: [
          /* eslint-disable*/
          { 
            owner: this.userId 
          },
          {
            'users._id': this.userId
          }]
          /* eslint-enable*/
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
        createdAt: new Date(),
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