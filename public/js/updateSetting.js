import axios from 'axios';
import { showAlerts } from './alerts';

export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updatePassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success')
      showAlerts('success', `${type.toUpperCase()} Data update successfully !`);
  } catch (error) {
    showAlerts('error', error.response.data.message);
  }
};
