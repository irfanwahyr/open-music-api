/* eslint-disable no-underscore-dangle */
const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist({ name, owner: credentialId });

    const response = h.response({
      status: 'success',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async postPlaylistSongsByIdHandler(request, h) {
    this._validator.validatePlaylistSongsPayload(request.payload);
    const { id } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const colab = await this._service.verifyPlaylistColab(id, credentialId);
    if (!colab) {
      await this._service.verifyPlaylistOwner(id, credentialId);
    }
    await this._service.addSongToPlaylist(id, songId, credentialId);

    await this._service.addPlaylistActivities(id, songId, credentialId, 'add', new Date());

    const response = h.response({
      status: 'success',
      message: 'lagu berhasil ditambah ke Playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;

    const playlists = await this._service.getPlaylists(credentialId);

    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async getPlaylistSongByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const colab = await this._service.verifyPlaylistColab(id, credentialId);
    if (!colab) {
      await this._service.verifyPlaylistOwner(id, credentialId);
    }
    const playlist = await this._service.getSongsFromPlaylist(id);

    return {
      status: 'success',
      data: {
        playlist,
      },
    };
  }

  async putPlaylistByIdHandler(request) {
    this._validator.validatePlaylistPayload(request.payload);
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.editPlaylistById(id, request.payload);

    return {
      status: 'success',
      message: 'Playlist berhasil diperbarui',
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId, 'forbidden');
    await this._service.deletePlaylistById(id);

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async deletePlaylistSongsByIdHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { songId } = request.payload;
    const { id } = request.params;
    const colab = await this._service.verifyPlaylistColab(id, credentialId);
    if (!colab) {
      await this._service.verifyPlaylistOwner(id, credentialId);
    }
    this._validator.validatePlaylistSongsPayload(request.payload);
    await this._service.deleteSongFromPlaylist(songId);

    await this._service.addPlaylistActivities(id, songId, credentialId, 'delete', new Date());

    return {
      status: 'success',
      message: 'lagu di Playlist berhasil dihapus',
    };
  }

  async getPlaylistActivitiesHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const colab = await this._service.verifyPlaylistColab(id, credentialId);
    if (!colab) {
      await this._service.verifyPlaylistOwner(id, credentialId);
    }
    const activities = await this._service.getPlaylistActivities(id);

    return {
      status: 'success',
      data: {
        playlistId: activities.id,
        activities: activities.activities,
      },
    };
  }
}

module.exports = PlaylistsHandler;
