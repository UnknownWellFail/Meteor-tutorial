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
  },{ $set: { used } });
 /* eslint-enable */
};

if (Meteor.isServer) {
  import { stripe } from '../../server/main';
  /* eslint-disable*/
  Meteor.publish('payments.my', () => {
    return Payments.find(
      {
        userId: this.userId
      },
    );
 /* eslint-enable */
  });

  Meteor.methods({
    createCharge: async function (token, itemName) {
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

      const customerId =  Meteor.users.findOne(this.userId).customerId;

      const data = {
        amount: item.amount,
        currency: Meteor.settings.currency,
        description: item.description,
        source: token,
      };

      if(!token.startsWith('tok')){
        data.customer = customerId;
      }

      const charge = await stripe.charges.create(data);

      if(charge){
        Payments.insert({
          userId: this.userId,
          value: item.amount,
          title: itemName,
          chargeId: charge.id,
          used: false
        });
      }

      return charge;
    },
    'addCard' (token) {
      check(token, String);

      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      const customerId = Meteor.users.findOne(this.userId).customerId;

      if(!customerId) {
        throw new Meteor.Error('Customer not found');
      }

      const source = stripe.customers.createSource(
        customerId,
        { source: token }
      );

      return source;
    },
    'getCards' (){
      if (!this.userId) {
        throw new Meteor.Error('Access denied');
      }

      const customerId = Meteor.users.findOne(this.userId).customerId;

      if(!customerId) {
        throw new Meteor.Error('Customer not found');
      }

      return stripe.customers.listCards(customerId);
    },

  });
}