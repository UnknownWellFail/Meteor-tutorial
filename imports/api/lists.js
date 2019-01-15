import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

import { getFullDay } from '../utils';
import { checkUserPayment } from './payments';
import { setPaymentUsed } from './payments';
import createList from './functions/createList';
import deleteList from './functions/deleteList';

export const Lists = new Mongo.Collection('lists');

export const getListsCountByUserId = userId => {
  return Lists.find({
    owner: userId
  }).count();
};

export const getListName = listId => {
  const list = Lists.findOne(listId, { fields: { name: 1 } });
  return list && list.name;
};

export const getListsByDate = ({ listsIds, date }) => {
  const day = getFullDay(date);

  const count = Lists.find(
    {
      _id: { $in: listsIds },
      createdAt: { $gte: day.start, $lte: day.end },
    }
  ).count();

  return count;
};

export const hasAccessToList = ({ listId, userId, roles }) => {
  if (!listId) {
    return true;
  }

  const list = Lists.findOne({
    _id: listId,
    $or: [
      { owner: userId },
      { 'users._id': userId },
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
  Meteor.publish('lists', function() {
    return Lists.find(
      {
        $or: [
          /* eslint-disable*/
          {
            owner: this.userId
          },
          {
            'users._id': this.userId
          }],
          /* eslint-enable  */
      },
    );
  });

  Meteor.methods({
    'lists.create'(name, chargeId) {
      check(name, String);
      check(chargeId, String);

      createList({ name, userId: this.userId, chargeId });
    },

    'lists.delete'(listId) {
      check(listId, String);

      deleteList({ userId: this.userId, listId });
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