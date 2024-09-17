const express = require('express');

const { protect, restrictTo } = require('../controllers/authController');
const {
  getCheckoutSession,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  createBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(protect);

router.get('/checkout-session/:tourId', getCheckoutSession);

router.use(restrictTo('admin', 'lead-guide'));

router.route('/').get(getBookings).post(createBooking);

router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking);

module.exports = router;
