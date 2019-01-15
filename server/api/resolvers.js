import { PubSub, withFilter } from 'graphql-subscriptions';
import { ForbiddenError } from 'apollo-server';

import { Lists } from '../../imports/api/lists.js';
import { Tasks } from '../../imports/api/tasks.js';
import { insertTask, deleteTask, createList, deleteList } from '../../imports/api/functions/index.js';

const pubsub = new PubSub();

const reduceList = newList => {
  if(!newList) {
    return null;
  }
  return { _id: newList._id, name: newList.name,
    ownerId: newList.owner, owner: Meteor.users.findOne(newList.owner), createdAt: newList.createdAt };
};

const resolver = {
  List: {
    owner: root => {
      return Meteor.users.findOne(root.owner);
    }
  },
  Task: {
    list: root => {
      return reduceList(Lists.findOne(root.listId));
    }
  },
  Query: {
    me: (_, __, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return context.user;
    },
    user: (_,{ _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return Meteor.users.findOne(_id);
    },
    lists: (_, __, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      let lists = Lists.find({
        $or: [
          /* eslint-disable*/
          {
            owner: context.user._id
          },
          {
            'users._id': context.user._id
          }],
          /* eslint-enable  */
      }).fetch();
      lists = lists.map(list => {
        return reduceList(list);
      });
      return lists;
    },
    list: async (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return reduceList(Lists.findOne(_id) );
    },
    tasks: (_, { listId }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const tasks =  Tasks.find({
        $or: [
          /* eslint-disable*/
          {
            private: { $ne: true }
          },
          {
            owner: context.user._id
          }]
        /* eslint-enable */
      }).fetch();
      if (listId) {
        return tasks.filter(task => task.listId === listId);
      }
      return tasks;
    },
    task: (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return Tasks.findOne({ $and: [ { _id }, { owner: context.user._id }] });
    },
  },
  Mutation: {
    createTask: (_, { task }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const createdTask = insertTask({ text: task.text, userId: context.user._id, listId: task.listId, chargeId: '' });

      const newTask = Tasks.findOne(createdTask);
      pubsub.publish('taskAdded', { taskAdded: newTask, userId: context.user._id });
      return newTask;
    },
    deleteTask: (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const task = Tasks.findOne(_id);
      deleteTask({ userId: context.user._id, taskId: _id });
      pubsub.publish('taskDeleted', { taskDeleted: task, userId: context.user._id });
      return task;
    },
    createList: (_, { name }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const createdList = createList({ name, userId: context.user._id });
      const newList = Lists.findOne(createdList);
      pubsub.publish('listAdded', { listAdded: newList, userId: context.user._id });
      return reduceList(newList);
    },
    deleteList: (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const list = Lists.findOne(_id);
      deleteList({ userId: context.user._id, listId: _id });
      pubsub.publish('listDeleted', { listDeleted: list, userId: context.user._id });
      return reduceList(list);
    },
  },
  Subscription: {
    taskAdded: {
      subscribe: withFilter( () => pubsub.asyncIterator('taskAdded'), (payload, variables, context) => {
        if(!context.user) {
          throw new Error('Access denied');
        }
        return payload.taskAdded.owner === context.user._id;
      }),
    },
    taskDeleted: {
      subscribe: withFilter( () => pubsub.asyncIterator('taskDeleted'), (payload, variables, context) => {
        if(!context.user) {
          throw new Error('Access denied');
        }
        return payload.taskDeleted.owner === context.user._id;
      }),
    },
    listAdded: {
      subscribe: withFilter( () => pubsub.asyncIterator('listAdded'), (payload, variables, context) => {
        if(!context.user) {
          throw new Error('Access denied');
        }
        return payload.listAdded.owner === context.user._id;
      }),
    },
    listDeleted: {
      subscribe: withFilter( () => pubsub.asyncIterator('listDeleted'), (payload, variables, context) => {
        if(!context.user) {
          throw new Error('Access denied');
        }
        return payload.listDeleted.owner === context.user._id;
      }),
    }
  }
};

export default resolver;