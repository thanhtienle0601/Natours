const { promisify } = require('util');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRED,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1. Check email Or password input
  if (!email || !password) {
    return next(new AppError('Please provide email and password !', 400));
  }

  //2. Check email and password in database
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Email or Password is incorrect !', 401));
  }

  createSendToken(user, 200, res);
});

const logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 1 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};

const protect = catchAsync(async (req, res, next) => {
  //1. Check token is exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //2. Check token is exist
  if (!token) {
    return next(new AppError('You are not logged in !', 401));
  }

  //3.Verify token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decode.id);

  //4. Check if user still exist
  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The token belonging to this user does no longer exist !',
        401,
      ),
    );
  }

  //5. Check if the password changed
  if (currentUser.passwordChangedAfter(decode.iat)) {
    return next(
      new AppError('User recently changed password! Please login again.', 401),
    );
  }

  //Grant
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1. Verify token
      const decode = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2. Check if user still exist
      const currentUser = await User.findById(decode.id);
      if (!currentUser) {
        return next();
      }

      // 3. Check if the password changed
      if (currentUser.passwordChangedAfter(decode.iat)) {
        return next();
      }

      // There is a logged user
      res.locals.user = currentUser;

      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    // console.log(req.user);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action !',
          403,
        ),
      );
    }
    next();
  };
};

const forgotPassword = catchAsync(async (req, res, next) => {
  //1.Get user with email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email !', 404));
  }

  //2.Create Password Reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3. Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    // await sendMail({
    //   email: user.email,
    //   subject: 'Your password reset token valid for 10 min',
    //   message,
    // });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email !',
    });
  } catch (error) {
    (user.passwordResetToken = undefined),
      (user.passwordResetExpires = undefined),
      await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email !', 500));
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or expired !', 400));
  }

  //2. Set new password
  (user.password = req.body.password),
    (user.passwordConfirm = req.body.passwordConfirm),
    (user.passwordResetToken = undefined),
    (user.passwordResetExpires = undefined);
  await user.save();

  //3. Log the user in and send JWT
  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  //1. Get the user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2. Check the old password is correct
  if (
    !user ||
    !(await user.correctPassword(req.body.passwordCurrent, user.password))
  ) {
    return next(
      new AppError('User is not exist or passwordCurrent is incorrect !', 401),
    );
  }
  //3. Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

module.exports = {
  signUp,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
};
