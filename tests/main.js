import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { assert } from 'chai';

import { Tasks } from '../imports/api/tasks.js';
import { check } from 'meteor/check';


describe("simple-todos", function () {

  if (Meteor.isServer) {
    describe('Tasks', () => {
      describe('methods', () => {
        const userId = Random.id();
        const userId2 = Random.id();

        console.log(userId);
        console.log(userId2);

        let taskId;
        let taskId2;

        beforeEach(() => {
          Tasks.remove({});
          taskId = Tasks.insert({
            text: 'test task',
            createdAt: new Date(),
            owner: userId,
            private: true,
            username: 'tmeasday',
          });


        });

        it('can delete owned private task', () => {
          const removeTask = Meteor.server.method_handlers['tasks.remove'];
          const invocation = { userId };

          removeTask.apply(invocation, [taskId]);
          assert.equal(Tasks.find().count(), 0);
        });

      });
    });
  }
});
