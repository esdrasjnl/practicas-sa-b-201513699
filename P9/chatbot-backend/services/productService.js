const axios = require('axios');
const { PRODUCT_SERVICE_URL } = process.env;


const getProducts = async () => {
const res = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
return res.data;
};


module.exports = { getProducts };