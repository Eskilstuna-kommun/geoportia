// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('table', table => {
    table.increments('id');

    table.string('entity_ref').notNullable();

    table.jsonb('schema').notNullable();
    table.jsonb('metadata').notNullable();
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
  await knex.schema.dropTable('attribute');
  await knex.schema.dropTable('table');
};
