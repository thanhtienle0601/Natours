// import axios from 'axios';
const axios = require('axios');

const generateAccessToken = async () => {
  try {
    const res = await axios({
      url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      method: 'post',
      data: 'grant_type=client_credentials',
      auth: {
        username:
          'AS0XnX9LYMxZWvFarHOjmXNWEgwHjs9uE7h8YwcpP6NpRqMkc6ehmDOEZg-7Y8qY41_aXHQFe6XK1-fd',
        password:
          'ELmOzdQJQXQWoHsvS0fYgWSgQMYfB5EjF19E7zTPGi1y9VQ9s8ep5mlEBVNCjmPxAJEGyPkf4tTwK27s',
      },
    });
    return res.data.access_token;
  } catch (error) {
    console.log(error);
  }
};

const createOrder = async (order, accessToken) => {
  try {
    const res = await axios({
      url: 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      // data: JSON.stringify({
      //   intent: 'CAPTURE',
      //   purchase_units: [
      //     {
      //       reference_id: 'default',
      //       items: [
      //         {
      //           name: 'TEST TOUR',
      //           description: 'The test tour !',
      //           quantity: 1,
      //           unit_amount: {
      //             currency_code: 'usd',
      //             value: '100.00',
      //           },
      //         },
      //       ],
      //     },
      //   ],

      //   application_context: {
      //     return_url: 'http://localhost:8000/my-tours',
      //     cancel_url: 'http://localhost:8000/',
      //   },
      // }),
      data: JSON.stringify(order),
    });
    console.log(res.data);
    return res.data.links.find((link) => link.rel === 'approve').href;
  } catch (error) {
    console.log('Axios error: ', error);
  }
};

const capturePayment = async (accessToken, orderId) => {
  try {
    const res = await axios({
      url:
        process.env.PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(res.data);
    return res.data;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { generateAccessToken, createOrder, capturePayment };
