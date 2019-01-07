import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { Elements, StripeProvider } from 'react-stripe-elements';

import CheckoutForm from './CheckoutForm';
import { Tasks } from '../api/tasks.js';
import Task from './Task.js';
import TaskList from './TaskList.js';
import AccountsUIWrapper from './AccountsUIWrapper.js';
import { Lists } from '../api/lists.js';
import { findDate } from '../api/dueDates.js';


// App component - represents the whole app1
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hideCompleted: false,
      taskName: '',
      payment: false,
      function: null,
      itemName: ''
    };
    this.listId = -1;
  }

  handleChangeTaskText(event) {
    this.setState({
      taskName: event.target.value
    });
  }

  showPaymentForm(func) {
    this.setState({
      payment: true,
      function: func,
      itemName: 'tasks'
    });
  }

  setListId(id) {
    if (this.listId !== id) {
      this.listId = id;
      this.setState({});
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    // Find the text field via the React ref
    const text = this.state.taskName.trim();
    const dueDate = findDate(text);

    let sendInsert = true;

    if (dueDate !== null && dueDate.text === '') {
      sendInsert = false;
      alert('Only due date in task text');
    }

    if (text === '') {
      sendInsert = false;
    }

    if (sendInsert) {
      mixpanel.track('TASK_WAS_CREATED',{ task:this.props.task });
      Meteor.call('tasks.insert', text, this.listId, '', (error, response) => {
        if (error && error.message.includes('Invalid payment') ) {
          const func = chargeId => {
            Meteor.call('tasks.insert', text, this.listId, chargeId);
          };
          this.showPaymentForm(func);
        }
      });
    }

    // Clear form
    this.setState({ taskName: '' });
  }

  toggleHideCompleted() {
    this.setState({
      hideCompleted: !this.state.hideCompleted,
    });
  }

  hidePayment() {
    this.setState({
      payment: false,
      function: null
    });
  }

  renderTasks() {
    let filteredTasks = this.props.tasks;
    if (this.state.hideCompleted) {
      filteredTasks = filteredTasks.filter(task => !task.checked);
    }

    if (this.listId !== '-1') {
      filteredTasks = filteredTasks.filter(task => task.listId === this.listId);
    }

    return filteredTasks.map(task => {
      const user = this.props.currentUser;
      const currentUserId = user && user._id;
      const showPrivateButton = task.owner === currentUserId;
      const googleUser = user && user.services && user.services.google && task.owner === user._id && task.dueDate;
      let listName = '';
      if (task.listId && this.listId === '-1') {
        const list = this.props.lists.find(item => item._id === task.listId);
        if (list) {
          listName = list.name;
        }
      }
      return (<Task
        key={task._id}
        task={task}
        showPrivateButton={showPrivateButton}
        userAuthorised={user}
        googleUser={googleUser}
        listName={listName}
        showPaymentForm={this.showPaymentForm.bind(this)}
      />);
    });
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.currentUser && nextProps.currentUser) {
      if (this.props.currentUser._id !== nextProps.currentUser._id) {
        this.listId = '-1';
      }
    } else {
      this.listId = '-1';
    }
    return true;
  }
  componentDidUpdate(prevProps){
    if(!prevProps.currentUser && this.props.currentUser){
      const currentUser = this.props.currentUser;
      mixpanel.identify(currentUser._id);
      mixpanel.people.set({
        name: currentUser.username,
        $email: currentUser.email ? currentUser.email : 'none'
      });
    }
  }

  render() {
    const options = this.props.lists.map(list => {
      return <option key={list._id} data-key={list._id}>{list.name}</option>;
    });
    options.unshift(<option key="-1" data-key="-1">All tasks</option>);

    return (
      <div className="container">
        <TaskList
          options={options}
          currentUser={this.props.currentUser}
          setListId={this.setListId.bind(this)}
          listId={this.listId}
          showPaymentForm={this.showPaymentForm.bind(this)}
        />
        <header>
          <h1>Todo List ({this.props.incompleteCount})</h1>
        </header>

        <label className="hide-completed">
          <input
            type="checkbox"
            readOnly
            checked={this.state.hideCompleted}
            onClick={this.toggleHideCompleted.bind(this)}
          />
          Hide Completed Tasks
        </label>

        <AccountsUIWrapper />
        {this.state.payment ?
          <StripeProvider apiKey={Meteor.settings.public.stripe_public_key}>
            <div className="example">
              <Elements>
                <CheckoutForm
                  handle={this.state.function}
                  hide={this.hidePayment.bind(this)}
                  userName={this.props.currentUser.username}
                  itemName={this.state.itemName}
                />
              </Elements>
            </div>
          </StripeProvider>
          : ''}

        {this.props.currentUser ?
          <form className="new-task" onSubmit={this.handleSubmit.bind(this)} >
            <input
              type="text"
              placeholder="Type to add new tasks"
              value={this.state.taskName}
              onChange={this.handleChangeTaskText.bind(this)}
            />
          </form> :
          ''
        }
        <ul>
          <ReactCSSTransitionGroup
            transitionName="example"
            transitionEnterTimeout={500}
            transitionLeaveTimeout={300}>
            {this.renderTasks()}
          </ReactCSSTransitionGroup>
        </ul>
      </div>
    );
  }
}

export default withTracker( () => {
  Meteor.subscribe('users.me');
  Meteor.subscribe('lists');
  Meteor.subscribe('tasks');

  return {
    lists: Lists.find().fetch(),
    tasks: Tasks.find({}, { sort: { createdAt: -1 } }).fetch(),
    incompleteCount: Tasks.find({ checked: { $ne: true } }).count(),
    currentUser: Meteor.user(),
  };
})(App);