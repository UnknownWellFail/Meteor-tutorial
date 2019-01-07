import React, { Component } from 'react';
import { CardElement, injectStripe } from 'react-stripe-elements';
import { Meteor } from 'meteor/meteor';

class CheckoutForm extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.submit = this.submit.bind(this);
  }

  async submit() {
    const { token } = await this.props.stripe.createToken({ name: this.props.userName });
    Meteor.call('createCharge', token.id, this.props.itemName, (err, response) => {
      if (response) {
        this.props.handle(response.id);
        this.props.hide();
      } else {
        this.setState({ error: err.message });
      }
    });
  }

  render() {
    return (
      <div className="checkout">
        {this.state.error ? this.state.error : 'Success'}
        <p>Would you like to complete the purchase?</p>
        <CardElement />
        <button onClick={this.submit}>Send</button>
      </div>
    );
  }
}

export default injectStripe(CheckoutForm);