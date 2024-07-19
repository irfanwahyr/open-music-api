/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    title: { type: 'VARCHAR', notNull: true },
    year: { type: 'INT', notNull: true },
    genre: { type: 'VARCHAR', notNull: true },
    performer: { type: 'VARCHAR', notNull: true },
    duration: { type: 'INT', notNull: false },
    albumId: { type: 'VARCHAR', notNull: false },
    created_at: { type: 'TEXT', notNull: true },
    updated_at: { type: 'TEXT', notNull: true },
  });

  pgm.addConstraint('songs', 'fk_songs.albumId_albums.id', {
    foreignKeys: {
      columns: 'albumId',
      references: 'albums(id)',
      onDelete: 'SET NULL',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('songs', 'fk_songs.albumId_albums.id');
  pgm.dropTable('songs');
};
