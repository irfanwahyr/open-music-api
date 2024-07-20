/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const PlaylistService = require('./PlaylistsService');

class ExportsService {
  constructor() {
    this._pool = new Pool();
    this._playlistService = new PlaylistService();

    this._init().then(() => {
      console.log('Consumer running');
    }).catch(console.error);
  }

  async _init() {
    this._connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    this._channel = await this._connection.createChannel();
    await this._channel.assertQueue('export:playlists', {
      durable: true,
    });

    this._channel.consume('export:playlists', this._consumeMessage.bind(this), {
      noAck: true,
    });
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

  async getPlaylists(userId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE owner = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async getSongsFromPlaylist(playlistId) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        JOIN users ON playlists.owner = users.id
        WHERE playlists.id = $1
      `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async sendMessage(queue, message) {
    await this._channel.sendToQueue(queue, Buffer.from(message));
  }

  async _sendMail(targetEmail, content) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: targetEmail,
      subject: 'Ekspor Playlist',
      text: 'Berikut adalah hasil ekspor playlist Anda.',
      attachments: [
        {
          filename: 'playlist.json',
          content: JSON.stringify(content),
        },
      ],
    });

    console.log('Message sent: %s', info.messageId);
  }

  async _consumeMessage(msg) {
    try {
      const { userId, targetEmail } = JSON.parse(msg.content.toString());
      const playlists = await this.getPlaylists(userId);
      const playlistId = playlists[0].id;

      const songs = await this.getSongsFromPlaylist(playlistId);

      const playlist = {
        id: playlistId,
        name: playlists[0].name,
        songs,
      };

      const content = { playlist };

      await this._sendMail(targetEmail, content);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = ExportsService;
