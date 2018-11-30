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
            list: 'My Tasks'
        };
    }

    findListByName(name) {
        const list = this.props.lists.find((list) => {
            if (list.name === name) return list;
        });
        return list;
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

        if (sendInsert) Meteor.call('tasks.insert', text, this.findListByName(this.state.list)._id);
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
            if (this.state.list !== 'default') return task.listId === this.findListByName(this.state.list)._id;
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

    handleChangeSelect() {
        const list = ReactDOM.findDOMNode(this.refs.list).value;
        this.setState({
            list: list
        });
    }

    render() {
        const options = this.props.lists.map((list) => {
            return <option key={list._id}>{list.name}</option>;
        });
        return (
            <div className="container">
                <select ref='list' onChange={this.handleChangeSelect.bind(this)}>
                    {options}
                </select>

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