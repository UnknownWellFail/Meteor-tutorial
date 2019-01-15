import React, { Component } from 'react';
import { CardElement, injectStripe } from 'react-stripe-elements';
import { Meteor } from 'meteor/meteor';

import Card from './Card';

class CheckoutForm extends Component {

  constructor(props) {
    super(props);
    this.state = { error: null, addCard: false };
    this.handlePayment = this.handlePayment.bind(this);
    this.handleAddCardClick = this.handleAddCardClick.bind(this);
  }

  componentDidMount(){
    Meteor.call('getCards', (err,response) => {
      const cards = response.data.map(item => {
        return (<Card
          key={item.id}
          card_id={item.id}
          number={item.last4}
          expired={item.exp_year}
          handlePayment={this.handlePayment}
        />);
      });
      this.cards = cards;
      this.setState({});
    });
  }

  async handleAddCardClick(){
    const { token } = await this.props.stripe.createToken({ name: this.props.userName });

    Meteor.call('addCard', token.id, () => {
      this.setState({ addCard: false });
      this.props.hide();
    });
  }


  async paymentWithoutToken() {
    const { token } = await this.props.stripe.createToken({ name: this.props.userName });

    Meteor.call('createCharge', token.id, 'tasks', (err, response) => {
      if (response) {
        this.props.handle(response.id);
        this.setState({ error: null, addCard: true });
      } else {
        this.setState({ error: err.message });
      }
    });
  }

  handlePayment(tokenId) {
    Meteor.call('createCharge', tokenId, 'tasks', (err, response) => {
      if (response) {
        this.props.handle(response.id);
        this.setState({ error: null, addCard: !tokenId });
        if(tokenId) {
          this.props.hide();
        }
      } else {
        this.setState({ error: err.message });
      }
    });
  }

  render() {
    return (
      <div className="checkout">

        {this.state.addCard ? '' : this.cards}
        {this.state.error ? this.state.error : 'Success'}
        <p>Would you like to complete the purchase?</p>
        <CardElement />
        <button onClick={this.paymentWithoutToken.bind(this)}>Send</button>
        {this.state.addCard ? <button onClick = {this.handleAddCardClick}>Add card</button> : ''}
      </div>
    );
  }
}

export default injectStripe(CheckoutForm);