const AlbumsHandler = require('./handler');
const routes = require('./routes');
const CacheService = require('../../services/redis/CacheService');
const AlbumsService = require('../../services/postgres/AlbumsService');

const CacheServiceInstance = new CacheService();
const albumsService = new AlbumsService(CacheServiceInstance);

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (server, { storagePath, validator }) => {
    const albumsHandler = new AlbumsHandler(
      albumsService,
      storagePath,
      validator,
      CacheServiceInstance,
    );
    server.route(routes(albumsHandler));
  },
};
