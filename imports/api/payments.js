import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

import {stripe} from '../../server/main.js';

export const Payments = new Mongo.Collection('payments');

if (Meteor.isServer) {
  Meteor.publish('payments.my', function paymentsList() {
    return Payments.find(
      {
        userId: this.userId
      },
    );
  });

  Meteor.methods({
    'createCharge'(token, title){
      check(token, String);
      check(title, String);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      if (title === '') {
        throw new Meteor.Error('Title is empty');
      }

      const item = Meteor.settings.payment[title];

      if (!item) {
        throw new Meteor.Error('Item not found');
      }

      const charge = stripe.charges.create({
        amount: item.price,
        currency: Meteor.settings.currency,
        description: item.description,
        source: token,
      });
      
      charge.then((res, err) => {
        if(res){
          Payments.insert({
            userId: this.userId,
            value: item.price,
            title: title,
            chargeId: res.id
          });
        }
      });

      return charge;
    },
  });
}