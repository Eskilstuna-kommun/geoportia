/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('geoportia_datasets', table => {
    table.string('id').primary().notNullable();
    table.string('name').notNullable();
    table.text('summary');
    table.string('versioning').defaultTo('Ej versionerad');
    table.boolean('allow_z_values').defaultTo(false);
    table.string('status').defaultTo('Utkast');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('geoportia_datasets');
};
