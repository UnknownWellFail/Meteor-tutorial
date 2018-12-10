import _ from 'lodash';

import { getTodayTasks } from '../tasks';
import { getListsByDate, getListName } from '../lists';

export const getNewListsWithTasks = userId => {
  const tasks = getTodayTasks(userId);

  let lists = tasks.map(task => task.listId);
  lists = lists.filter( (item, pos) => item && lists.indexOf(item) === pos);

  return getListsByDate({ listsIds: lists, date: new Date() });
};

export const getPopularList = userId => {
  const tasks = getTodayTasks(userId);

  const listsTasksCount = [];
  for (const task of tasks) {
    if (!task.listId) {
      continue;
    }
    const index = listsTasksCount.findIndex(list => list._id === task.listId);
    if (index === -1) {
      listsTasksCount[listsTasksCount.length] = { _id: task.listId, count: 1 };
    } else {
      listsTasksCount[index].count += 1;
    }
  }
  const sortedListsTasksCount = _.sortBy(listsTasksCount, [function(list) { return -list.count; }]);

  const popular = sortedListsTasksCount[0];
  if (popular) {
    return getListName(popular._id);
  }
  return 'None';
};

export const getNewCheckedTasksCount = userId => {
  let tasks = getTodayTasks(userId);
  tasks = tasks.filter(task => task.checked);
  return tasks.length;
};