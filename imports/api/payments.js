import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';



export const Payments = new Mongo.Collection('payments');

export const checkUserPayment = (chargeId, title) => {
  /* eslint-disable*/
  const payment = Payments.findOne({  
    userId: this.userId,
    chargeId,
    title,
    used: false
  });
 /* eslint-enable */
  return !!payment;
};

export const setPaymentUsed = (chargeId, used) => {
  /* eslint-disable*/
  Payments.update({
    userId: this.userId,
    chargeId
  },{ $set : { used } });
 /* eslint-enable */
};

if (Meteor.isServer) {
  import { stripe } from '../../server/main';
  /* eslint-disable*/
  Meteor.publish('payments.my', function paymentsList() {
    return Payments.find(
      {
        userId: this.userId
      },
    );
 /* eslint-enable */
  });

  Meteor.methods({
    'createCharge'(token, itemName){
      check(token, String);
      check(itemName, String);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      if (itemName === '') {
        throw new Meteor.Error('Title is empty');
      }

      const item = Meteor.settings.items[itemName];

      if (!item) {
        throw new Meteor.Error('Item not found');
      }

      const charge = stripe.charges.create({
        amount: item.amount,
        currency: Meteor.settings.currency,
        description: item.description,
        source: token,
      });

      charge.then(res => {
        if(res){
          Payments.insert({
            userId: this.userId,
            value: item.amount,
            title: itemName,
            chargeId: res.id,
            used: false
          });
        }
      });

      return charge;
    },
  });
}