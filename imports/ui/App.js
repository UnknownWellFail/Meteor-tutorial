import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Tasks } from '../api/tasks.js';
import Task from './Task.js';
import AccountsUIWrapper from './AccountsUIWrapper.js';
import { Lists } from '../api/lists.js';

// App component - represents the whole app1
class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hideCompleted: false,
            list: -1,
        };
    }

    handleListAdd(event) {
        event.preventDefault();
        const text = ReactDOM.findDOMNode(this.refs.textInputList).value.trim();

        if (text === '') alert('List name can`t be empty')
        else Meteor.call('lists.create', text);

        ReactDOM.findDOMNode(this.refs.textInputList).value = '';
    }

    handleSubmit(event) {
        event.preventDefault();

        // Find the text field via the React ref
        const text = ReactDOM.findDOMNode(this.refs.textInput).value.trim();
        const dueDate = findDate(text);

        let sendInsert = true;

        if (dueDate !== null && dueDate.text === '') {
            sendInsert = false;
            alert('Only due date in task text');
        }

        if (text === '') sendInsert = false;

        if (sendInsert) Meteor.call('tasks.insert', text, this.state.list);
        // Clear form
        ReactDOM.findDOMNode(this.refs.textInput).value = '';
    }

    toggleHideCompleted() {
        this.setState({
            hideCompleted: !this.state.hideCompleted,
        });
    }
    
    renderTasks() {
        let filteredTasks = this.props.tasks;
        if (this.state.hideCompleted) {
            filteredTasks = filteredTasks.filter(task => !task.checked);
        }

        filteredTasks = filteredTasks.filter(task => {
            if (this.state.list !== -1) return task.listId === this.state.list;
            else if (this.props.lists[0]) return task.listId === this.props.lists[0]._id;
        });

        return filteredTasks.map((task) => {
            const user = this.props.currentUser;
            const currentUserId = user && user._id;
            const showPrivateButton = task.owner === currentUserId;
            const userAuthorised = !!user;
            const googleUser = user && user.services && user.services.google && task.owner === user._id && task.dueDate;

            return (<Task
                key={task._id}
                task={task}
                showPrivateButton={showPrivateButton}
                userAuthorised={userAuthorised}
                googleUser={googleUser}
            />);
        });
    }

    deleteThisTaskList() {
        Meteor.call('lists.delete', this.state.list !== -1 ? this.state.list : this.props.lists[0]._id, (error, response) => {
            if (error) alert('You can`t delete your last list');
        });
    }

    handleChangeSelect(event) {
        const selectedIndex = event.target.options.selectedIndex;

        const list = event.target.options[selectedIndex].getAttribute('data-key');
        this.setState({
            list: list
        });
    }

    render() {
        const options = this.props.lists.map((list) => {
            return <option key={list._id} data-key={list._id}>{list.name}</option>;
        });
        return (
            <div className="container">
                <select ref='list' onChange={this.handleChangeSelect.bind(this)}>
                    {options}
                </select>
                {this.props.currentUser ?
                    <form className="new-task-list" onSubmit={this.handleListAdd.bind(this)} >
                        <input
                            type="text"
                            ref="textInputList"
                            placeholder="Type to add new tasks list"
                        />
                    </form> : ''
                }
                {this.props.currentUser ? (
                    <button className="delete-list" onClick={this.deleteThisTaskList.bind(this)}>
                        Delete this list
                </button>) : ''}

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

                {this.props.currentUser ?
                    <form className="new-task" onSubmit={this.handleSubmit.bind(this)} >
                        <input
                            type="text"
                            ref="textInput"
                            placeholder="Type to add new tasks"
                        />
                    </form> : ''
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

export default withTracker(() => {
    Meteor.subscribe('tasks');
    Meteor.subscribe('users.me');
    Meteor.subscribe('lists');
    return {
        lists: Lists.find().fetch(),
        tasks: Tasks.find({}, { sort: { createdAt: -1 } }).fetch(),
        incompleteCount: Tasks.find({ checked: { $ne: true } }).count(),
        currentUser: Meteor.user(),
    };
})(App);