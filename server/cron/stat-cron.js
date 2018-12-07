import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/percolate:synced-cron';

import { sendMail } from '../email/email-sender';
import { countNewCheckedTasks, newListsWithTasks, getPopularList }  from '../tasks-stat';
import { userIsActive } from '../../imports/api/tasks';

export const addStatCron = () => {
  SyncedCron.add({
    name: 'Stat cron',
    schedule: function(parser) {
      return parser.text('at 9:00 pm');
    },
    job: function() {
      let users = Meteor.users.find().fetch();
      users = users.filter(item => item.email);
      for(const user of users){
        if(!userIsActive(user._id) ){
          continue;
        }
        let text = 'Statistic: ';
        text += ' new checked tasks: ' + countNewCheckedTasks(user._id);
        text += ' new lists with tasks: ' + newListsWithTasks(user._id);
        text += ' popular list: ' + getPopularList(user._id);
        sendMail({ to: user.email, subject: 'statistic', text });
      }
    }
  });
};