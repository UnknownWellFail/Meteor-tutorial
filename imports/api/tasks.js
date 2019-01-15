import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';

import { hasAccessToList } from './lists';
import { getS3 } from './aws-conf';
import { getTodayDate, setLastUserActive, getUrlParams } from '../utils/';
import { checkUserPayment } from './payments';
import { setPaymentUsed } from './payments';
import insertTask from './functions/insertTask';
import deleteTask from './functions/deleteTask';

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

export const getTasksCountByUserId = userId => {
  return Tasks.find({
    owner: userId
  }).count();
};

if (Meteor.isServer) {
  Meteor.publish('tasks', function() {
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
    'tasks.insert'(text, listId, chargeId) {
      check(text, String);
      check(listId, String);
      check(chargeId, String);

      insertTask({ text, userId: this.userId, listId, chargeId });
    },
    'tasks.remove'(taskId) {
      check(taskId, String);

      deleteTask({ userId: this.userId, taskId });
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
    'tasks.addToGoogleCalendar'(taskId, chargeId) {
      check(taskId, String);
      check(chargeId, String);

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

      if (!checkUserPayment(chargeId, 'calendar') ){
        throw new Meteor.Error('Invalid payment');
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
            setPaymentUsed(chargeId, true);
            setLastUserActive(this.userId);

            Tasks.update(taskId, { $set: { googleEventId: result.data.id, disabled: false } });
            resolve();
          }
        });
      });
    },
    'tasks.addImage'(taskId, fileName, fileData, chargeId) {
      check(taskId, String);
      check(fileName, String);
      check(fileData, String);
      check(chargeId, String);

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

      if (!checkUserPayment(chargeId, 'image')){
        throw new Meteor.Error('Invalid payment');
      }

      setPaymentUsed(chargeId, true);

      fileName = `f${(+new Date).toString(16)}` + fileName;

      const base64data = new Buffer(fileData, 'binary');
      const data = {
        Key: fileName,
        Body: base64data,
        ACL: 'private',
      };
      const s3 = getS3();
      const bound = Meteor.bindEnvironment(callback => { callback(); });
      s3.putObject(data, (err, data) => {
        if (err) {
          console.log('Error uploading data');
        } else {
          console.log('succesfully uploaded the image!');
          s3.getSignedUrl('getObject', { Bucket: Meteor.settings.bucket, Key: fileName }, (err, res) => {
            bound( () => {
              if (res) {
                const urlParams = getUrlParams(res);
                Tasks.update(taskId, { $push: { images: { fileName, url: res, expires: urlParams.Expires } } });
              }else {
                throw new Meteor.Error('Error in process loading file');
              }
            });
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

      return new Promise((resolve, reject) => {
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