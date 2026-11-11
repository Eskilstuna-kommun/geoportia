// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('geoportia_data_owner_entities', table => {
    table.string('entity_ref').primary();
    table.jsonb('entity').notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('geoportia_data_owner_entities');
};
