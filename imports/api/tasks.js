import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http'

import findDate from './dueDates'
import { hasAccessToList } from './lists'

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

  Meteor.methods({
    'tasks.insert'(text, listId) {
      check(text, String);
      check(listId, String);

      // Make sure the user is logged in before inserting a task
      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      if (text === '') {
        throw new Meteor.Error('Text is empty');
      }

      const dueDate = findDate(text);

      if (dueDate !== null && dueDate.text === '') {
        throw new Meteor.Error('Text is empty');
      }

      if (listId !== '-1' && !hasAccessToList({ listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      Tasks.insert({
        text,
        createdAt: new Date(),
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
        private: false,
        dueDate: dueDate && { start: dueDate.date.start, end: dueDate.date.end },
        listId: listId !== '-1' && listId
      });
    },
    'tasks.remove.list'(listId) {
      check(listId, String);
      Tasks.remove({
        listId: listId
      });
    },
    'tasks.remove'(taskId) {
      check(taskId, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      Tasks.remove({
        _id: taskId,
        $or: [
          { private: { $ne: true } },
          { owner: this.userId },
        ]
      });
    },
    'tasks.setChecked'(taskId, setChecked) {
      check(taskId, String);
      check(setChecked, Boolean);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      Tasks.update({
        _id: taskId,
        $or: [
          { private: { $ne: true } },
          { owner: this.userId }]
      }, { $set: { checked: setChecked } })
    },
    'tasks.setPrivate'(taskId, setToPrivate) {
      check(taskId, String);
      check(setToPrivate, Boolean);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      // Make sure only the task owner can make a task private
      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      Tasks.update(taskId, { $set: { private: setToPrivate } });
    },
    'tasks.addToGoogleCalendar'(taskId) {
      check(taskId, String);

      const task = Tasks.findOne(taskId);

      if (task === null) {
        throw new Meteor.Error('Task not found');
      }

      if (task.disabled) {
        throw new Meteor.Error('Sending request now');
      }
      const user = Meteor.users.findOne(task.owner);

      if (!this.userId || !user) {
        throw new Meteor.Error('Not authorized');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      if (!user.services || !user.services.google) {
        throw new Meteor.Error('Only google authorized');
      }

      Tasks.update(taskId, { $set: { disabled: true } });

      const dataObject = {
        headers: {
          'Authorization': 'Bearer ' + user.services.google.accessToken,
          'Content-Type': 'application/json'
        },
        data: {
          summary: task.text,
          start: {
            dateTime: task.dueDate.start,
          },
          end: {
            dateTime: task.dueDate.end,
          }
        }
      };
      return new Promise((resolve, reject) => {
        HTTP.post('https://www.googleapis.com/calendar/v3/calendars/primary/events', dataObject, (error, result) => {
          if (error) {
            Tasks.update(taskId, { $set: { disabled: false } });
            reject(error);
          }
          if (result) {
            Tasks.update(taskId, { $set: { googleEventId: result.data.id, disabled: false } });
            resolve();
          }
        });
      });
    },
    'tasks.removeFromGoogleCalendar'(taskId) {
      check(taskId, String);

      const task = Tasks.findOne(taskId);

      if (task === null) {
        throw new Meteor.Error('Task not found');
      }

      if (task.disabled) {
        throw new Meteor.Error('Sending request now');
      }

      const user = Meteor.users.findOne(task.owner);

      if (!this.userId || !user) {
        throw new Meteor.Error('Not authorized');
      }
      
      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] })) {
        throw new Meteor.Error('You do not have permissions');
      }

      if (!user.services || !user.services.google) {
        throw new Meteor.Error('Only google authorized');
      }

      if (!task.googleEventId) {
        throw new Meteor.Error('Task is not in google calendar');
      }

      Tasks.update(taskId, { $set: { disabled: true } });

      const dataObject = {
        headers: {
          'Authorization': 'Bearer ' + user.services.google.accessToken,
          'Content-Type': 'application/json'
        },
      }

      return new Promise((resolve, reject) => {
        HTTP.del('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + task.googleEventId, dataObject, (error, result) => {
          Tasks.update(taskId, {
            $unset: { googleEventId: "" },
            $set: { disabled: false }
          });
          if (error) reject(error);
          else resolve();
        });
      });
    },
  });
}