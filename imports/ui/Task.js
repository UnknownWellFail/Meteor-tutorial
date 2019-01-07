import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import classnames from 'classnames';

// Task component - represents a single todo item
class Task extends Component {

  toggleChecked() {
    // Set the checked property to the opposite of its current value
    Meteor.call('tasks.setChecked', this.props.task._id, !this.props.task.checked);
    mixpanel.track("TASK_WAS_CHECKED", { task: this.props.task });
  }

  deleteThisTask() {
    Meteor.call('tasks.remove', this.props.task._id);
    mixpanel.track("TASK_WAS_REMOVED", { task: this.props.task });
  }

  togglePrivate() {
    Meteor.call('tasks.setPrivate', this.props.task._id, !this.props.task.private);
    mixpanel.track("TASK_WAS_PRIVATE", { task: this.props.task });
  }

  addToGoogleCalendar() {
    if (this.props.task.googleEventId) {
      Meteor.call('tasks.removeFromGoogleCalendar', this.props.task._id, (error, response) => {
        if (error) {
          alert(error.text);
        }
      });
      mixpanel.track("TASK_WAS_REMOVED_FROM_GOOGLE", { task: this.props.task });
    }
    else {
      Meteor.call('tasks.addToGoogleCalendar', this.props.task._id, '', (error, response) => {
        if (error && error.message.includes('Invalid payment') ) {
          const func = chargeId => {
            mixpanel.track("TASK_WAS_ADDED_TO_GOOGLE", { task: this.props.task });
            Meteor.call('tasks.addToGoogleCalendar', this.props.task._id, chargeId);
          };
          this.props.showPaymentForm(func,'calendar');
        }
      });
    }
  }

  changeFile(event) {
    const file = event.target.files[0];
    this.setState({
      file,
    });
  }

  uploadFile() {
    const file = this.state.file;
    const reader = new FileReader();
    const taskId = this.props.task._id;
    const showPaymentForm = this.props.showPaymentForm;
    reader.onload = function (fileLoadEvent) {
      Meteor.call('tasks.addImage', taskId, file.name, reader.result, '', (error ,response) => {
        if (error && error.message.includes('Invalid payment') ) {
          const func = chargeId => {
            Meteor.call('tasks.addImage', taskId, file.name, reader.result, chargeId);
          };
          showPaymentForm(func,'image');
        } else {
          alert(error);
        }
      });
    };
    reader.readAsBinaryString(file);
  }

  render() {
    // Give tasks a different className when they are checked off,
    // so that we can style them nicely in CSS
    const userAuthorised = this.props.userAuthorised;
    const googleUser = this.props.googleUser;

    const task = this.props.task;
    let imagesUrls;

    if (task.images) {
      imagesUrls = task.images.map(item => {
        return <img className="task_image" key={item.url} src={item.url} />;
      });
    }
    const taskClassName = classnames({
      checked: this.props.task.checked,
      private: this.props.task.private,
    });
    return (
      <li className={taskClassName}>
        {userAuthorised && googleUser ? (
          <input
            type="checkbox"
            readOnly
            disabled={!!this.props.task.disabled}
            checked={!!this.props.task.googleEventId}
            onClick={this.addToGoogleCalendar.bind(this)}
          />
        ) : ''}

        {userAuthorised ? (
          <button className="delete" onClick={this.deleteThisTask.bind(this)}>
            &times;
          </button>) :
          ''}

        {userAuthorised ? (
          <input
            type="checkbox"
            readOnly
            checked={!!this.props.task.checked}
            onClick={this.toggleChecked.bind(this)}
          />
        ) : ''}
        {imagesUrls}
        {this.props.showPrivateButton ? (
          <button className="toggle-private" onClick={this.togglePrivate.bind(this)}>
            {this.props.task.private ? 'Public' : 'Private'}
          </button>
        ) : ''}

        <span className="text">
          <strong>{this.props.task.username}</strong>: {this.props.task.text} <strong className="task-list-name">{this.props.listName}</strong>
        </span>

        <input onChange={this.changeFile.bind(this)} type="file" />
        <button onClick={this.uploadFile.bind(this)}>Send</button>

      </li>
    );
  }
}

export default Task;