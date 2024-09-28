import axios from 'axios';
import { showAlerts } from './alerts';

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from api
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session.data.url);
    // 2) Create checkout form + charge credit card
    window.location.replace(session.data.url);
  } catch (error) {
    console.log(error);
    showAlerts('error', error);
  }
};
