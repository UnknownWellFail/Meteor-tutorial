import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http'

import findDate from './dueDates'

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
    'tasks.insert'(text) {
      check(text, String);
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

      Tasks.insert({
        text,
        createdAt: new Date(),
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
        private: false,
        inGoogle: false,
        dueDate: dueDate && { start: dueDate.date.start, end: dueDate.date.end },
      });
    },

    'tasks.remove'(taskId) {
      check(taskId, String);

      if (!this.userId) {
        throw new Meteor.Error('Not authorized');
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

      if (task === null) {
        throw new Meteor.Error('Task not found');
      }
      // Make sure only the task owner can make a task private
      if (task.owner !== this.userId) {
        throw new Meteor.Error('Not authorized');
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
      const usr = Meteor.users.findOne(this.userId);

      if (!this.userId || !usr) {
        throw new Meteor.Error('Not authorized');
      }

      if (task.owner !== this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      if (!usr.services || !usr.services.google) {
        throw new Meteor.Error('Only google authorized');
      }

      Tasks.update(taskId, { $set: { disabled: true } });

      const dataObject = {
        headers: {
          'Authorization': 'Bearer ' + usr.services.google.accessToken,
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

      HTTP.post('https://www.googleapis.com/calendar/v3/calendars/primary/events', dataObject, (error, result) => {
        if (error) {
          console.log('err', error);
        }
        if (result) {
          Tasks.update(taskId, { $set: { GTaskId: result.data.id, inGoogle: true, disabled: false } });
        }
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

      const usr = Meteor.users.findOne(this.userId);

      if (!this.userId || !usr) {
        throw new Meteor.Error('Not authorized');
      }

      if (task.owner !== this.userId) {
        throw new Meteor.Error('Not authorized');
      }

      if (!usr.services || !usr.services.google) {
        throw new Meteor.Error('Only google authorized');
      }

      if (!task.GTaskId) {
        throw new Meteor.Error('Task is not in google calendar');
      }

      Tasks.update(taskId, { $set: { disabled: true } });

      const dataObject = {
        headers: {
          'Authorization': 'Bearer ' + usr.services.google.accessToken,
          'Content-Type': 'application/json'
        },
      }


      HTTP.del('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + task.GTaskId, dataObject, (error, result) => {
        if (error) {
          console.log('err', error);
        }
        if (result) {
          Tasks.update(taskId, {
            $unset: { GTaskId: "", inGoogle: "" },
            $set: { disabled: false }
          });
        }
      });


    },
  });
}