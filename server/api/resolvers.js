import { PubSub, withFilter } from 'graphql-subscriptions';
import { ForbiddenError } from 'apollo-server';

import { Lists } from '../../imports/api/lists.js';
import { Tasks } from '../../imports/api/tasks.js';
import { insertTask, deleteTask, createList, deleteList } from '../../imports/api/functions/index.js';

const pubsub = new PubSub();

const resolver = {
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
      return Lists.find().fetch();
    },
    list: async (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return Lists.findOne(_id);
    },
    tasks: (_, __, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return Tasks.find().fetch();
    },
    task: (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      return Tasks.findOne(_id);
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
      return newList;
    },
    deleteList: (_, { _id }, context) => {
      if(!context.user) {
        throw new ForbiddenError('Access denied');
      }
      const list = Lists.findOne(_id);
      deleteList({ userId: context.user._id, listId: _id });
      pubsub.publish('listDeleted', { listDeleted: list, userId: context.user._id });
      return list;
    },
  },
  Subscription: {
    taskAdded: {
      subscribe: withFilter( () => pubsub.asyncIterator('taskAdded'), (payload, variables) => {
        return payload.taskAdded.owner === variables.userId;
      }),
    },
    taskDeleted: {
      subscribe: withFilter( () => pubsub.asyncIterator('taskDeleted'), (payload, variables) => {
        return payload.taskDeleted.owner === variables.userId;
      }),
    },
    listAdded: {
      subscribe: withFilter( () => pubsub.asyncIterator('listAdded'), (payload, variables) => {
        return payload.listAdded.owner === variables.userId;
      }),
    },
    listDeleted: {
      subscribe: withFilter( () => pubsub.asyncIterator('listDeleted'), (payload, variables) => {
        return payload.listDeleted.owner === variables.userId;
      }),
    }
  }
};

export default resolver;