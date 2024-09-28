const { buffer } = require('micro');
const stripe = require('stripe')(process.env.STRIPE_SECRET_API_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAll,
  getOne,
  updateOne,
  deleteOne,
  createOne,
} = require('../controllers/handleFactory');
const User = require('../models/userModel');
const {
  generateAccessToken,
  createOrder,
  capturePayment,
} = require('../services/paypal');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          unit_amount: tour.price * 100,
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
            ],
          },
        },
        quantity: 1,
      },
    ],
  });
  // const session = await createOrder({
  //   intent: 'CAPTURE',
  //   purchase_units: [
  //     {
  //       reference_id: `${tour.id}`,
  //       custom_id: `${req.user.id}`,
  //       items: [
  //         {
  //           name: `${tour.name}`,
  //           description: `${tour.summary}`,
  //           quantity: 1,
  //           unit_amount: {
  //             currency_code: 'usd',
  //             value: `${tour.price}`,
  //           },
  //         },
  //       ],
  //       amount: {
  //         currency_code: 'USD',
  //         value: '100.00',
  //         breakdown: {
  //           item_total: {
  //             currency_code: 'usd',
  //             value: '100.00',
  //           },
  //         },
  //       },
  //     },
  //   ],
  //   application_context: {
  //     payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
  //     brand_name: 'NATOURS',
  //     locale: 'en-US',
  //     shipping_preference: 'NO_SHIPPING',
  //     user_action: 'PAY_NOW',
  //     return_url: 'http://localhost:8000/my-tours',
  //     cancel_url: 'http://localhost:8000/',
  //   },
  // });
  // 3)Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

const getAccessToken = catchAsync(async (req, res, next) => {
  const accessToken = await generateAccessToken();
  res.status(200).json({
    status: 'success',
    accessToken,
  });
});

const createPaymentLink = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  const accessToken = await generateAccessToken();
  // const urlImage = `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`;
  // console.log(urlImage);

  const order = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `${tour.id}`,
        custom_id: `${req.user.id}`,
        items: [
          {
            name: `${tour.name}`,
            description: `${tour.summary}`,
            // image_url: `https://www.natours.dev/${tour.imageCover}`,
            quantity: 1,
            unit_amount: {
              currency_code: 'usd',
              value: `${tour.price}`,
            },
          },
        ],
        amount: {
          currency_code: 'USD',
          value: `${tour.price}`,
          breakdown: {
            item_total: {
              currency_code: 'usd',
              value: `${tour.price}`,
            },
          },
        },
      },
    ],
    application_context: {
      payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
      brand_name: 'NATOURS',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      // return_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
      return_url: `${req.protocol}://${req.get('host')}/completed-order`,
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    },
  };
  const url = await createOrder(order, accessToken);

  res.status(200).json({
    status: 'success',
    url,
  });
});

const createBookingCheckout = async (result) => {
  const tour = result.purchase_units[0].reference_id;
  const user = result.purchase_units[0].payments.captures[0].custom_id;
  const price = result.purchase_units[0].payments.captures[0].amount.value;
  console.log(tour, user, price);
  await Booking.create({ tour, user, price });
};

const createPaymentCheckout = catchAsync(async (req, res, next) => {
  if (!req.query.token) return next();

  try {
    const accessToken = await generateAccessToken();
    const result = await capturePayment(accessToken, req.query.token);
    // res.status(201).json({
    //   status: 'success',
    //   result,
    // });
    if (result.status === 'COMPLETED') {
      await createBookingCheckout(result);
    }
  } catch (error) {
    return res.status(400).send(`payment error: ${error}`);
  }

  res.redirect(`${req.protocol}://${req.get('host')}/my-tours`);
});

const webHookCheckout = catchAsync(async (req, res, next) => {
  const reqBuffer = await buffer(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      reqBuffer,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    // console.log(event);
  } catch (error) {
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
});

const createBooking = createOne(Booking);
const getBookings = getAll(Booking);
const getBooking = getOne(Booking);
const updateBooking = updateOne(Booking);
const deleteBooking = deleteOne(Booking);

module.exports = {
  getCheckoutSession,
  getAccessToken,
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  webHookCheckout,
  createPaymentLink,
  createBookingCheckout,
  createPaymentCheckout,
};
