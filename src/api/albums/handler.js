/* eslint-disable no-underscore-dangle */
const autoBind = require('auto-bind');
const fs = require('fs');
const StorageService = require('../../services/storage/StorageService');

class AlbumsHandler {
  constructor(service, storagePath, validator, cacheService) {
    this._service = service;
    this._validator = validator;
    this._storagePath = storagePath;
    this._cacheService = cacheService;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;

    const albumId = await this._service.addAlbum({ name, year });

    const response = h.response({
      status: 'success',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);

    const coverFiles = fs.readdirSync(this._storagePath);
    const coverFilename = coverFiles.find((file) => file.endsWith('.jpg'));
    let coverUrl = null;

    if (coverFilename) {
      coverUrl = `http://${process.env.HOST}:${process.env.PORT}/uploads/file/images/${coverFilename}`;
    }

    return {
      status: 'success',
      data: {
        album: {
          ...album,
          coverUrl,
        },
      },
    };
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;

    await this._service.editAlbumById(id, request.payload);

    return {
      status: 'success',
      message: 'Album berhasil diperbarui',
    };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    return {
      status: 'success',
      message: 'Album berhasil dihapus',
    };
  }

  async postUploadImageHandler(request, h) {
    const { cover } = request.payload;
    this._validator.validateImageHeaders(cover.hapi.headers);

    const storageService = new StorageService(this._storagePath);

    await storageService.writeFile(cover, cover.hapi);
    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });
    response.code(201);
    return response;
  }

  async postLikeAlbumHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.getAlbumById(id);

    await this._service.checkUserLikeAlbum(id, credentialId);

    await this._service.addLikeToAlbum(id, credentialId);
    await this._cacheService.delete(`album:${id}`);

    return h.response({
      status: 'success',
      message: 'Album liked successfully',
    }).code(201);
  }

  async deleteLikeAlbumHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { id } = request.params;

    await this._service.deleteLikes(credentialId);
    await this._cacheService.delete(`album:${id}`);

    return h.response({
      status: 'success',
      message: 'Like removed successfully',
    }).code(200);
  }

  async getLikesCountHandler(request, h) {
    const { id } = request.params;

    try {
      const result = await this._cacheService.get(`album:${id}`);
      const resultInt = parseInt(result, 10);
      return h.response({
        status: 'success',
        data: {
          likes: resultInt,
        },
      }).header('X-Data-Source', 'cache');
    } catch (error) {
      const likesCount = await this._service.getLikesCount(id);
      await this._cacheService.set(`album:${id}`, likesCount, 1800);
      return h.response({
        status: 'success',
        data: {
          likes: likesCount,
        },
      }).header('X-Data-Source', 'database');
    }
  }
}

module.exports = AlbumsHandler;
