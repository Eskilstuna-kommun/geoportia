// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('geoportia_datasets', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('summary');
    table.string('versioning').defaultTo('Ej versionerad');
    table.boolean('allow_z_values').defaultTo(false);
    table.string('status').notNullable().defaultTo('Godkänd');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('geoportia_datasets');
};
