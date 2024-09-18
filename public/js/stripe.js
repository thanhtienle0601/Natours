const stripe = Stripe(
  'pk_test_51Pxg9HKz66CdPDlPCbOcS6Zb6L9D2QQxJglwS1lnYBzvDgjzRxDjWtznxT6jmHQyuodwiQTqgdhKAvaau8xHmKLG00qfvZz4Mk',
);
import axios from 'axios';
import { showAlerts } from './alerts';

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from api
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({ sessionId: session.data.session.id });
  } catch (error) {
    console.log(error);
    showAlerts('error', error);
  }
};
