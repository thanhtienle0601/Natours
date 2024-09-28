const express = require('express');

const { protect, restrictTo } = require('../controllers/authController');
const {
  getCheckoutSession,
  getAccessToken,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  createBooking,
  createPaymentLink,
  createBookingCheckout,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(protect);

router.get('/checkout-session/:tourId', createPaymentLink);

router.use(restrictTo('admin', 'lead-guide'));

router.route('/').get(getBookings).post(createBooking);

router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking);

module.exports = router;
