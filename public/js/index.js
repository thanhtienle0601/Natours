import '@babel/polyfill';
import { login, logout } from './login';
import { displayMap } from './mapBox';
import { updateSettings } from './updateSetting';
import { bookTour } from './paypal';

const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const updateUserData = document.querySelector('.form-user-data');
const updateUserPassword = document.querySelector('.form-user-password');
const logoutBtn = document.querySelector('.nav__el--logout');
const bookTourBtn = document.getElementById('book-tour');

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (updateUserData) {
  updateUserData.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.querySelector('#name').value);
    form.append('email', document.querySelector('#email').value);
    form.append('photo', document.querySelector('.form__upload').files[0]);
    // const name = document.querySelector('#name').value;
    // const email = document.querySelector('#email').value;
    updateSettings(form, 'data');
  });
}

if (updateUserPassword) {
  updateUserPassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.querySelector('#password-current').value;
    const password = document.querySelector('#password').value;
    const passwordConfirm = document.querySelector('#password-confirm').value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );

    document.querySelector('#password-current').value = '';
    document.querySelector('#password').value = '';
    document.querySelector('#password-confirm').value = '';

    document.querySelector('.btn--save-password').textContent = 'Save password';
  });
}

if (bookTourBtn) {
  bookTourBtn.addEventListener('click', async (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
    // const url = await createOrder(tourId);
    // window.location.replace(url);
  });
}
