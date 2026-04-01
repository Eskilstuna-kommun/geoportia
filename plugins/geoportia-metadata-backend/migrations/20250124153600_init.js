// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('geoportia_metadata', table => {
    table.increments('id');

    table.string('entity_ref').notNullable();

    table.jsonb('schema').notNullable();
    table.jsonb('metadata').notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('geoportia_metadata');
};
