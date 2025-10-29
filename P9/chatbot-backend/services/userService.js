const axios = require('axios');
const { USER_SERVICE_URL } = process.env;


const getUsers = async () => {
const res = await axios.get(`${USER_SERVICE_URL}/users`);
return res.data;
};


module.exports = { getUsers };