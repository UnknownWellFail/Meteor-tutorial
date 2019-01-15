import { Tasks } from '../tasks';
import { findDate } from '../dueDates';
import { hasAccessToList } from '../lists';
import { checkUserPayment } from '../payments';
import { setPaymentUsed } from '../payments';
import { getTasksCountByUserId } from '../tasks';
import { setLastUserActive } from '../../utils';

const insertTask = ({ text, userId, listId, chargeId }) => {
  if (!userId) {
    throw new Meteor.Error('Access denied');
  }

  if (text === '') {
    throw new Meteor.Error('Text is empty');
  }

  const dueDate = findDate(text);

  if (dueDate !== null && dueDate.text === '') {
    throw new Meteor.Error('Text is empty');
  }

  if (listId !== '-1' && !hasAccessToList({ listId, userId: userId, roles: ['admin'] }) ) {
    throw new Meteor.Error('Access denied');
  }

  if (getTasksCountByUserId(userId) > 9 && !checkUserPayment(chargeId, 'tasks') ){
    throw new Meteor.Error('Invalid payment');
  }

  setLastUserActive(userId);

  setPaymentUsed(chargeId, true);

  const createdTask = Tasks.insert({
    text,
    createdAt: new Date(),
    owner: userId,
    username: Meteor.users.findOne(userId).username,
    private: false,
    dueDate: dueDate && { start: dueDate.date.start, end: dueDate.date.end },
    listId: listId === '-1' ? null : listId
  });

  return createdTask;
};

export default insertTask;