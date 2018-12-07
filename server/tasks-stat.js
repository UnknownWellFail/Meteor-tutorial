import { getTodayTasks } from '../imports/api/tasks';
import { createdToday, getListName } from '../imports/api/lists';

export const newListsWithTasks = userId => {
  const tasks = getTodayTasks(userId);

  let lists = tasks.map(task => task.listId);
  lists = lists.filter( (item, pos) =>  item && lists.indexOf(item) === pos);

  return createdToday({ listsIds: lists });
};

export const getPopularList = userId => {
  const tasks = getTodayTasks(userId);

  const listIds = [];
  for(const task of tasks) {
    if(!task.listId){
      continue;
    }
    const index = listIds.findIndex(list => list.id === task.listId);
    if(index === -1) {
      listIds[listIds.length] = { id: task.listId, count: 1 };
    } else {
      listIds[index].count += 1;
    }
  }

  listIds.sort( (first, second) => {
    if(first.count < second.count) {
      return 1;
    }
    if(first.count > second.count) {
      return -1;
    }
  });
  const popular = listIds[0];
  if(popular) {
    return getListName(popular.id);
  }
  return 'None';
};

export const countNewCheckedTasks = userId => {
  let tasks = getTodayTasks(userId);
  tasks = tasks.filter(task => task.checked);
  return tasks.length;
};