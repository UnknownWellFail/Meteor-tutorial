import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import classnames from 'classnames';

// Task component - represents a single todo item
class Task extends Component {

  toggleChecked() {
    // Set the checked property to the opposite of its current value
    Meteor.call('tasks.setChecked', this.props.task._id, !this.props.task.checked);
    mixpanel.track("Checked task");
  }

  deleteThisTask() {
    Meteor.call('tasks.remove', this.props.task._id);
    mixpanel.track("Remove task");
  }

  togglePrivate() {
    Meteor.call('tasks.setPrivate', this.props.task._id, !this.props.task.private);
    mixpanel.track("Set task is private/public");
  }

  addToGoogleCalendar() {
    if (this.props.task.googleEventId) {
      Meteor.call('tasks.removeFromGoogleCalendar', this.props.task._id, (error, response) => {
        if (error) {
          alert(error.text);
        }
      });
      mixpanel.track("Remove from google calendar");
    }
    else {
      Meteor.call('tasks.addToGoogleCalendar', this.props.task._id, (error, response) => {
        mixpanel.track("Add to google calendar");
        if (error) {
          alert(error.text);
        }
      });
    }
  }

  render() {
    // Give tasks a different className when they are checked off,
    // so that we can style them nicely in CSS
    const taskClassName = classnames({
      checked: this.props.task.checked,
      private: this.props.task.private,
    });

    return (
      <li className={taskClassName}>
        {this.props.userAuthorised && this.props.googleUser ? (
          <input
            type="checkbox"
            readOnly
            disabled={!!this.props.task.disabled}
            checked={!!this.props.task.googleEventId}
            onClick={this.addToGoogleCalendar.bind(this)}
          />
        ) : ''}

        {this.props.userAuthorised ? (
          <button className="delete" onClick={this.deleteThisTask.bind(this)}>
            &times;
          </button>) :
          ''}

        {this.props.userAuthorised ? (
          <input
            type="checkbox"
            readOnly
            checked={!!this.props.task.checked}
            onClick={this.toggleChecked.bind(this)}
          />
        ) : ''}

        {this.props.showPrivateButton ? (
          <button className="toggle-private" onClick={this.togglePrivate.bind(this)}>
            {this.props.task.private ? 'Public' : 'Private' }
          </button>
        ) : ''}

        <span className="text">
          <strong>{this.props.task.username}</strong>: {this.props.task.text} <strong className="task-list-name">{this.props.listName}</strong>
        </span>

      </li>
    );
  }
}

export default Task;