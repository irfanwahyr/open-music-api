/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistColab(id, owner) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      return false;
    }

    const playlist = result.rows[0];

    if (playlist.user_id === owner) {
      return true;
    }

    return false;
  }

  async addPlaylist({ name, owner }) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const queryPlaylistsOwned = {
      text: 'SELECT * FROM playlists WHERE owner = $1',
      values: [owner],
    };

    const resultOwned = await this._pool.query(queryPlaylistsOwned);

    if (resultOwned.rowCount > 0) {
      return resultOwned.rows.map((row) => ({
        id: row.id,
        name: row.name,
        username: row.owner,
      }));
    }

    const queryCollaborations = {
      text: `
        SELECT p.id AS id, p.name AS name, u.username AS username
        FROM playlists p
        JOIN users u ON p.owner = u.id
        JOIN collaborations c ON p.id = c.playlist_id
        WHERE c.user_id = $1
      `,
      values: [owner],
    };

    const resultCollaborations = await this._pool.query(queryCollaborations);

    return resultCollaborations.rows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
    }));
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
  }

  async addSongToPlaylist(playlistId, songId) {
    const findSongQuery = {
      text: 'SELECT id FROM songs WHERE id = $1',
      values: [songId],
    };

    const findSongResult = await this._pool.query(findSongQuery);

    if (findSongResult.rows.length === 0) {
      throw new NotFoundError('Lagu tidak ada dalam songs');
    }

    const id = nanoid(16);

    const insertQuery = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const insertResult = await this._pool.query(insertQuery);

    if (!insertResult.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }

    return insertResult.rows[0].id;
  }

  async getSongsFromPlaylist(playlistId) {
    const playlistQuery = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        JOIN users ON playlists.owner = users.id
        WHERE playlists.id = $1
      `,
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = playlistResult.rows[0];

    const songsQuery = {
      text: `
        SELECT songs.id, songs.title, songs.performer
        FROM songs
        JOIN playlist_songs ON songs.id = playlist_songs.song_id
        WHERE playlist_songs.playlist_id = $1
      `,
      values: [playlistId],
    };

    const songsResult = await this._pool.query(songsQuery);

    return {
      id: playlist.id,
      name: playlist.name,
      username: playlist.username,
      songs: songsResult.rows.map((song) => ({
        id: song.id,
        title: song.title,
        performer: song.performer,
      })),
    };
  }

  async deleteSongFromPlaylist(songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE song_id = $1 RETURNING id',
      values: [songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Lagu tidak ditemukan di dalam playlist');
    }
  }

  async addPlaylistActivities(playlistId, songId, credentialId, action, time) {
    const id = nanoid(16);
    const query = {
      text: `
      INSERT INTO playlist_song_activities
      (id, playlist_id, song_id, user_id, action, time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      values: [id, playlistId, songId, credentialId, action, time],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Aktivitas gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylistActivities(id) {
    const query = {
      text: `
        SELECT u.username, s.title, psa.action, psa.time
        FROM playlist_song_activities psa
        JOIN playlists p ON psa.playlist_id = p.id
        JOIN users u ON p.owner = u.id
        JOIN songs s ON psa.song_id = s.id
        WHERE psa.playlist_id = $1
      `,
      values: [id],
    };

    const result = await this._pool.query(query);
    const activities = result.rows;

    if (activities.length === 0) {
      throw new NotFoundError('Aktivitas tidak ditemukan untuk playlist ini');
    }

    return {
      id,
      activities: activities.map((activity) => ({
        username: activity.username,
        title: activity.title,
        action: activity.action,
        time: activity.time,
      })),
    };
  }
}

module.exports = PlaylistsService;
