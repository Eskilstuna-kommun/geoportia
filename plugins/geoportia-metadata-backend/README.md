# geoportia-metadata-backend

GeoPortia metadata storage and management APIs, including the Data Owner workflow.

## Data Owner management

The Dataägare tab creates and edits standard Backstage `Group` entities with
`spec.type: data-owner`. GeoPortia stores managed Groups in its plugin database
and publishes them through a Backstage `EntityProvider`; it does not introduce
a custom entity kind or write directly to the catalog database.

- Internal owners use `organization.name` from configuration. External owners
  provide organisation name and email; the email is stored in the standard Group
  `spec.profile.email` field.
- Hierarchy values are administered from the Dataägare page and are also
  published as standard `Group` entities. Departments require a Förvaltning and
  units require an Avdelning/Område. Deletion is blocked while a value is used.
- `geoportia.dataOwner.statuses` and `geoportia.dataOwner.databaseUsers` in
  `app-config.yaml` define selectable values. Database-user entries contain only
  platform, name, and optional description—never credentials.
- Responsible people are catalog `User` entities. The UI searches catalog
  profiles and renders the available profile fields as a contact card.
- `receiveReminders` uses positive semantics: `true` means receive reminders.
  This API does not import an old opt-out value or deliver reminders; any legacy
  value must be inverted by the migration process.
- Agreement history is displayed if present, but adding/importing history is
  blocked until its legacy fields and behavior are confirmed with stakeholders.

The existing scaffolder action `geoportia:dataowner:create` remains available.
It generates a standard Backstage `Group` in `catalog-info.yaml` for the normal
publish/register workflow; the Dataägare page instead saves records through the
managed catalog provider.

## Data-owner scaffolder action

The existing scaffolder module registers `geoportia:dataowner:create`. It generates
a standard Backstage `Group` with `spec.type: data-owner` in the `default`
namespace, without introducing a custom entity kind or storage API.

- Required input: `name` (Backstage-compatible entity name),
  `internalOrganisation`, `status` (non-empty string), and `receiveReminders`.
- Optional input: `displayName` (defaults to `name`) and `description`.
- Internal owners use `organization.name` from backend configuration. External
  owners instead require `organisationName` and `organisationEmail`; the email
  uses the standard Group `spec.profile.email` field. External-only input is
  rejected for internal owners, and hierarchy input is rejected for external ones.
- Internal hierarchy: `administration`, `department`, and `unit` are catalog
  Group references. A department requires an administration and a unit requires a
  department. The action validates the selected parent-child relationships. The
  most specific selected Group becomes the data owner's standard `spec.parent`.
- `databaseUsers` accepts multiple `{ platform, name, description? }` entries.
  Identical user names on different platforms are allowed; duplicates within the
  same platform and unknown properties such as passwords are rejected.
- `responsible` is a validated catalog User reference. AD-backed profile and
  contact-card information stays on the User entity rather than being copied.
- `receiveReminders` has **positive semantics**: `true` means receive reminders
  and `false` means do not receive them. It must be supplied explicitly, without
  an implicit default. Any future legacy opt-out import must invert that flag;
  the action does not accept or silently reinterpret a legacy checkbox value.
- `managementAgreementHistory` starts as `[]`. Only empty history is accepted
  until the legacy history format is confirmed; importing or appending history
  is deliberately not implemented.
- Output: `entityRef` and `catalogInfoPath` (`catalog-info.yaml`, relative to the
  task workspace).
- The action supports dry runs and refuses to overwrite an existing catalog file.

The action only generates a catalog file. A later template can use built-in
publish actions and `catalog:register` to publish and register it. The Dataägare
management screen is available at `/listView` and requires an authenticated
GeoPortia role for edits; only Admin/Super Admin users can change hierarchy
value lists.

## Data-owner scaffolder action

The existing scaffolder module registers `geoportia:dataowner:create`. It generates
a standard Backstage `Group` with `spec.type: data-owner` in the `default`
namespace, without introducing a custom entity kind or storage API.

- Input: `name` (required, Backstage-compatible entity name), `displayName`
	(optional, defaults to `name`), and `description` (optional).
- Output: `entityRef` and `catalogInfoPath` (`catalog-info.yaml`, relative to the
	task workspace).
- The action supports dry runs and refuses to overwrite an existing catalog file.

The action only generates the catalog file. A later template can use built-in
publish actions and `catalog:register` to publish and register it. No data-owner
form, organisation hierarchy, AD lookup, reminders, agreement history, or admin UI
is included in this action.

## Installation

This plugin is installed via the `@internal/backstage-plugin-geoportia-metadata-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/backstage-plugin-geoportia-metadata-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/backstage-plugin-geoportia-metadata-backend'));
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn dev` from the root directory.
