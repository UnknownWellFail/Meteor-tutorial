import { Meteor } from 'meteor/meteor';
import { CronJob } from 'cron';

import { sendMail } from './email-sender';
import { getNewCheckedTasksCount, getNewListsWithTasks, getPopularList } from './tasks-stat';
import { getTodayDate } from '../../utils';

export const addStatCron = () => {
  new CronJob('00 00 21 * * *', async function () {
    let users = Meteor.users.find().fetch();
    users = users.filter(item => item.email);
    for (const user of users) {
      if(!user || !user.lastActiveAt || user.lastActiveAt < getTodayDate.start || user.lastActiveAt > getTodayDate.end) {
        continue;
      }
      let text = `Statistics:
        new checked tasks: ${getNewCheckedTasksCount(user._id)} 
        new lists with tasks: ${getNewListsWithTasks(user._id)}
        popular list: ${getPopularList(user._id)}
     `;
      sendMail({ to: user.email, subject: 'statistic', text });
    }
  }).start();
};