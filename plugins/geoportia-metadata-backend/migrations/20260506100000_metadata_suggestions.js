exports.up = async function up(knex) {
  await knex.schema.createTable('geoportia_metadata_suggestions', table => {
    table.increments('id');

    table
      .integer('metadata_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('geoportia_metadata')
      .onDelete('CASCADE');

    table.jsonb('metadata').notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.string('suggested_by').notNullable();
    table.index('suggested_by', 'idx_geoportia_metadata_suggestions_suggested_by');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable('geoportia_metadata_suggestions');
};
