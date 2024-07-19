/* eslint-disable no-underscore-dangle */
const autoBind = require('auto-bind');

class CollaborationsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postCollaborationHandler(request, h) {
    this._validator.validateCollaborationPayload(request.payload);
    const { playlistId, userId } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(playlistId, credentialId);

    const collaborationId = await this._service.addCollaboration({ playlistId, userId });

    const response = h.response({
      status: 'success',
      data: {
        collaborationId,
      },
    });
    response.code(201);
    return response;
  }

  async deleteCollaborationHandler(request) {
    this._validator.validateCollaborationPayload(request.payload);
    const { playlistId, userId } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(playlistId, credentialId);

    await this._service.deleteCollaboration({ playlistId, userId });

    return {
      status: 'success',
      message: 'Kolaborasi berhasil dihapus',
    };
  }
}

module.exports = CollaborationsHandler;
