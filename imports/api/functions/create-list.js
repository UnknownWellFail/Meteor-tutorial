import { Lists } from '../lists';
import { checkUserPayment } from '../payments';
import { setPaymentUsed } from '../payments';
import { getListsCountByUserId } from '../lists';

const createList = ({ name, userId, chargeId }) => {
  if (!userId) {
    throw new Meteor.Error('Not authorized');
  }

  if (name === '') {
    throw new Meteor.Error('Name can`t be empty');
  }

  if (getListsCountByUserId(userId) > 2 && !checkUserPayment(chargeId, 'list') ){
    throw new Meteor.Error('Invalid payment');
  }

  setPaymentUsed(chargeId, true);

  const createdList = Lists.insert({
    name,
    owner: userId,
    createdAt: new Date(),
    username: Meteor.users.findOne(userId).username,
  });
  return createdList;
};

export default createList;