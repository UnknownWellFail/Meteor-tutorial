import { CronJob } from 'cron';

import { sendMail } from './email-sender';
import { getNewCheckedTasksCount, getNewListsWithTasks, getPopularList } from './tasks-stat';
import { getTodayDate } from '../../utils';

export const addStatCron = () => {
  const job = async () => {
    let users = Meteor.users.find().fetch();
    users = users.filter(item => item.email);
    users = users.filter(user => user && user.lastActiveAt &&
      user.lastActiveAt >= getTodayDate.start && user.lastActiveAt <= getTodayDate.end);
    users.map(user => {
      const text = `Statistics:
      new checked tasks: ${getNewCheckedTasksCount(user._id)} 
      new lists with tasks: ${getNewListsWithTasks(user._id)}
      popular list: ${getPopularList(user._id)}
   `;
      sendMail({ to: user.email, subject: 'Statistics', text });
      return user;
    });
  };
  new CronJob(Meteor.settings.cron_period, job).start();
};