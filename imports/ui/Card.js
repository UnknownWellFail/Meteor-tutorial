import React, { Component } from 'react';

class Card extends Component {

  constructor(props) {
    super(props);
  }

  handleClick() {
    this.props.handlePayment(this.props.card_id);
  }

  render() {
    return (
      <div>
        <p>Card: {this.props.number} {this.props.expired}</p>
        <button onClick = {this.handleClick.bind(this)}> Send </button>
      </div>);
  }

}

export default Card;