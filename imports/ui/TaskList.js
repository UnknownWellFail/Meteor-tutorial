import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import classnames from 'classnames';
import ReactDOM from 'react-dom';

class TaskList extends Component {

  constructor(props) {
    super(props);

  }

  handleListAdd(event) {
    event.preventDefault();
    const text = ReactDOM.findDOMNode(this.refs.textInputList).value.trim();

    if (text === '') alert('List name can`t be empty')
    else Meteor.call('lists.create', text);

    ReactDOM.findDOMNode(this.refs.textInputList).value = '';
  }

  deleteThisTaskList() {
    const listId = this.props.listId;
    if (listId === '-1') {
      alert('You can`t delete this list')
      return;
    }
    Meteor.call('lists.delete', listId, (error, response) => {
      if (error) alert(error);
    });
  }

  handleChangeSelect(event) {
    const selectedIndex = event.target.options.selectedIndex;

    const list = event.target.options[selectedIndex].getAttribute('data-key');
    this.props.setListId(list);
  }

  render() {
    return (
      <div className="task-list">
        {this.props.currentUser ?
          <select ref='list' onChange={this.handleChangeSelect.bind(this)}>
            {this.props.options}
          </select> : ''
        }
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

      </div>
    );
  }
}

export default TaskList;