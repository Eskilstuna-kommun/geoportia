// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('table', table => {
    table.increments('id');

    table.string('entity_ref').notNullable();

    table.string('database').notNullable();
    table.string('name').notNullable();
    table.integer('version').notNullable().unsigned();
    table.boolean('active').notNullable();

    // Dynamic metadata approach: keep the schema used to create the metadata and the metadata itself.
    table.jsonb('schema').notNullable();
    table.jsonb('metadata').notNullable();

    // Legacy columns kept for backwards compatibility with existing API/code.
    table.string('title').notNullable();
    table.string('owner').notNullable();
    table.jsonb('properties').notNullable();

    table.unique(['database', 'name', 'version']);
    table.unique(['database', 'name'], {
      predicate: knex.where('active', knex.raw(true)),
    });

    // Ensure only one active metadata entry per described entity.
    table.unique(['entity_ref'], {
      predicate: knex.where('active', knex.raw(true)),
    });
  });
  await knex.schema.createTable('attribute', table => {
    table
      .integer('table_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('table');
    table.string('name').notNullable();
    table.string('title').notNullable();
    table.string('type').notNullable();
    table.jsonb('properties').notNullable();

    table.primary(['table_id', 'name']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('table');
  await knex.schema.dropTable('attribute');
};
