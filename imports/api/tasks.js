import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import Task from '../ui/Task';

export const Tasks = new Mongo.Collection('tasks');

if (Meteor.isServer) {
  Meteor.publish('tasks', function tasksPublconsication() {
    return Tasks.find(
      {
        $or: [
          { private: { $ne: true } },
          { owner: this.userId }]
      }
    );
  });
}

Meteor.methods({
  'tasks.insert'(text) {
    check(text, String);
    // Make sure the user is logged in before inserting a task
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text,
      createdAt: new Date(),
      owner: this.userId,
      username: Meteor.users.findOne(this.userId).username,
    });
  },
  'tasks.remove'(taskId) {
    check(taskId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.remove({
      $and: [
        { _id: taskId },
        {
          $or: [
            { private: { $ne: true } },
            { owner: this.userId }]
        }]
    });
  },
  'tasks.setChecked'(taskId, setChecked) {
    check(taskId, String);
    check(setChecked, Boolean);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const task = Tasks.findOne(taskId);
    if (task.private && task.owner !== this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    Tasks.update(taskId, { $set: { checked: setChecked } });
  },
  'tasks.setPrivate'(taskId, setToPrivate) {
    check(taskId, String);
    check(setToPrivate, Boolean);

    const task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  },
});