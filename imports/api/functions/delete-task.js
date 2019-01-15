import { Tasks } from '../tasks';
import { hasAccessToList } from '../lists';
import { setLastUserActive } from '../../utils';

const deleteTask = ({ userId, taskId }) => {
  if (!userId) {
    throw new Meteor.Error('Access denied');
  }

  const task = Tasks.findOne(taskId);

  if (!task) {
    throw new Meteor.Error('Task not found');
  }

  if (!hasAccessToList({ listId: task.listId, userId: userId, roles: ['admin'] }) ) {
    throw new Meteor.Error('Access denied');
  }

  setLastUserActive(userId);

  Tasks.remove({
    _id: taskId,
    $or: [
      { private: { $ne: true } },
      { owner: userId },
    ]
  });
};

export default deleteTask;