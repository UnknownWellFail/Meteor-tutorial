import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';

import { findDate } from './dueDates';
import { hasAccessToList } from './lists';
import { s3 } from './aws-conf';
import { getTodayDate, setLastUserActive, getUrlParams } from '../utils/';


export const Tasks = new Mongo.Collection('tasks');

export const getTodayTasks = userId => {
  const date = getTodayDate();
  return Tasks.find(
    {
      owner: userId,
      createdAt: { $gte: date.start, $lte: date.end },
    },
  ).fetch();
};

if (Meteor.isServer) {
  Meteor.publish('tasks', function tasksPublconsication() {
    return Tasks.find(
      {
        $or: [
          /* eslint-disable*/
          {
            private: { $ne: true }
          },
          {
            owner: this.userId
          }]
        /* eslint-enable */
      },
    );
  });

  Meteor.methods({
    'tasks.insert'(text, listId) {
      check(text, String);
      check(listId, String);

      // Make sure the user is logged in before inserting a task
      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      if (text === '') {
        throw new Meteor.Error('Text is empty');
      }

      const dueDate = findDate(text);

      if (dueDate !== null && dueDate.text === '') {
        throw new Meteor.Error('Text is empty');
      }

      if (listId !== '-1' && !hasAccessToList({ listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }
      setLastUserActive(this.userId);

      Tasks.insert({
        text,
        createdAt: new Date(),
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
        private: false,
        dueDate: dueDate && { start: dueDate.date.start, end: dueDate.date.end },
        listId: listId === '-1' ? null : listId
      });
    },
    'tasks.remove.list'(listId) {
      check(listId, String);
      setLastUserActive(this.userId);
      Tasks.remove({
        listId: listId
      });
    },
    'tasks.remove'(taskId) {
      check(taskId, String);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }

      setLastUserActive(this.userId);

      Tasks.remove({
        _id: taskId,
        $or: [
          { private: { $ne: true } },
          { owner: this.userId },
        ]
      });
    },
    'tasks.setChecked'(taskId, isChecked) {
      check(taskId, String);
      check(isChecked, Boolean);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }

      setLastUserActive(this.userId);

      Tasks.update({
        _id: taskId,
        $or: [
          { private: { $ne: true } },
          { owner: this.userId }]
      }, { $set: { checked: isChecked } });
    },
    'tasks.setPrivate'(taskId, isPrivate) {
      check(taskId, String);
      check(isPrivate, Boolean);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      // Make sure only the task owner can make a task private
      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }
      setLastUserActive(this.userId);

      Tasks.update(taskId, { $set: { private: isPrivate } });
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
        throw new Meteor.Error('Access denied');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }

      if (!user.services || !user.services.google) {
        throw new Meteor.Error('Only google authorized');
      }

      Tasks.update(taskId, { $set: { disabled: true } });

      const dataObject = {
        headers: {
          Authorization: 'Bearer ' + user.services.google.accessToken,
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
            setLastUserActive(this.userId);

            Tasks.update(taskId, { $set: { googleEventId: result.data.id, disabled: false } });
            resolve();
          }
        });
      });
    },
    'tasks.addImages'(taskId, fileName, fileData) {
      check(taskId, String);
      check(fileName, String);
      check(fileData, String);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }
      const task = Tasks.findOne(taskId);

      if (!task) {
        throw new Meteor.Error('Task not found');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
      }
      fileName = `f${(+new Date).toString(16)}` + fileName;

      const base64data = new Buffer(fileData, 'binary');
      const data = {
        Key: fileName,
        Body: base64data,
        ACL: 'private',
      };

      const bound = Meteor.bindEnvironment(callback => { callback(); });

      s3.putObject(data, (err, data) => {
        if (err) {
          console.log('Error uploading data');
        } else {
          console.log('succesfully uploaded the image!');
          s3.getSignedUrl('getObject', { Bucket: 'meteor-test-todo-1', Key: fileName }, (err, res) => {
            if (res) {
              const urlParams = getUrlParams(res);
              bound( ()=> {
                Tasks.update(taskId, { $push: { images: { fileName: fileName, url:res, expires: urlParams.Expires } } });
              });
            }
          });
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

      const user = Meteor.users.findOne(task.owner);

      if (!this.userId || !user) {
        throw new Meteor.Error('Access denied');
      }

      if (!hasAccessToList({ listId: task.listId, userId: this.userId, roles: ['admin'] }) ) {
        throw new Meteor.Error('Access denied');
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
          Authorization: 'Bearer ' + user.services.google.accessToken,
          'Content-Type': 'application/json'
        },
      };

      return new Promise( (resolve, reject) => {
        HTTP.del('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + task.googleEventId, dataObject, (error, result) => {
          Tasks.update(taskId, {
            $unset: { googleEventId: "" },
            $set: { disabled: false }
          });
          if (error) {
            reject(error);
          }
          else {
            setLastUserActive(this.userId);
            resolve();
          }
        });
      });
    },
  });
}