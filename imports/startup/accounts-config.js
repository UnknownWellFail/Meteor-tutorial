import { Accounts } from 'meteor/accounts-base';

Accounts.ui.config({
  requestPermissions: {
    google:
      ['https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/tasks'],
  },
  passwordSignupFields: 'USERNAME_ONLY',
});