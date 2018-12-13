import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

class TaskList extends Component {

  constructor(props) {
    super(props);
    this.state = {
      listName: ''
    };
  }

  handleChangeTaskText(event) {
    this.setState({
      listName: event.target.value
    });
  }

  handleListAdd(event) {
    event.preventDefault();
    const text = this.state.listName.trim();

    if (text === '') {
      alert('List name can`t be empty');
    }
    else {
      Meteor.call('lists.create', text);
      mixpanel.track("TASK_LIST_WAS_CREATED",{ listName: text });
    }

    this.setState({ listName: '' });
  }

  deleteThisTaskList() {
    const listId = this.props.listId;
    if (listId === '-1') {
      alert('You can`t delete this list');
      return;
    }
    Meteor.call('lists.delete', listId, (error, response) => {
      if (error) {
        alert(error);
      }
      mixpanel.track("TASK_LIST_WAS_REMOVED");
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
          <select onChange={this.handleChangeSelect.bind(this)}>
            {this.props.options}
          </select> :
          ''
        }
        {this.props.currentUser ?
          <form className="new-task-list" onSubmit={this.handleListAdd.bind(this)} >
            <input
              type="text"
              placeholder="Type to add new tasks list"
              value={this.state.listName}
              onChange={this.handleChangeTaskText.bind(this)}
            />
          </form> :
          ''
        }
        {this.props.currentUser ? (
          <button className="delete-list" onClick={this.deleteThisTaskList.bind(this)}>
            Delete this list
          </button>) :
          ''}

      </div>
    );
  }
}

export default TaskList;