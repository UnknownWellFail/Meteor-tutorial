import { Email } from 'meteor/email';
import { check } from 'meteor/check';

export const sendMail = ({ to, subject, text }) => {
  check([to, subject, text], [String]);
  Email.send({ to, from:'Meteor test todo <mctestemail@yandex.ru>', subject, text });
};