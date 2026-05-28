// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('geoportia_metadata', table => {
    table.boolean('deleted').notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('geoportia_metadata', table => {
    table.dropColumn('deleted');
  });
};
