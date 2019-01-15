import { Lists } from '../lists';
import { Tasks } from '../tasks';
import { setLastUserActive } from '../../utils';

const deleteList = ({ userId, listId }) => {

  if (!userId) {
    throw new Meteor.Error('Not authorized');
  }

  if (Lists.find({ owner: userId }).count() === 1) {
    throw new Meteor.Error('You can`t remove your last list');
  }

  Lists.remove({
    _id: listId,
    owner: userId
  });

  setLastUserActive(userId);
  Tasks.remove({
    listId: listId
  });
};

export default deleteList;