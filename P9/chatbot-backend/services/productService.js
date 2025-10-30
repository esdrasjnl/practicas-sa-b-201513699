const axios = require('axios');

const getProducts = async (filter = null) => {
  try {
    const res = await axios.get('http://34.63.21.230:8011/products');
    let products = res.data;

    // Filtrado por palabra clave
    if (filter) {
      const keyword = filter.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
      );
    }

    console.log('➡️ Ejecutando getProducts() con filtro:', filter || 'ninguno');
    return products;
  } catch (err) {
    console.error('❌ Error en getProducts():', err.message);
    throw err;
  }
};

module.exports = { getProducts };
