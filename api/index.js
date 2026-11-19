// Función serverless de Vercel: usa la aplicación ya compilada (npm run build deja los alias resueltos en dist/).
module.exports = require('../dist/serverless').default;
