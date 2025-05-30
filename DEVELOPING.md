# Developing GeoPortia

## Framework

GeoPortia is built using [Backstage](https://backstage.io/). Backstage is originally a platform for building developer
portals, which GeoPortia extends to be a platform for building data portals.

Backstage is built using [React](https://reactjs.org/) and [Node.js](https://nodejs.org/), with
[TypeScript](https://www.typescriptlang.org/).

GeoPortia should as much as possible be built following the standards, best practices and conventions used by Backstage,
and integrate with the wider Backstage ecosystem.

Some relevant parts of the Backstage documentation for developers of GeoPortia are:

* [Architecture Overview](https://backstage.io/docs/overview/architecture-overview)
* [Software Catalog - Overview](https://backstage.io/docs/features/software-catalog/)
* [Software Catalog - The Life of an Entity](https://backstage.io/docs/features/software-catalog/life-of-an-entity)
* [Software Catalog - System Model](https://backstage.io/docs/features/software-catalog/system-model) (note that this model is significantly extended in GeoPortia)
* [Plugins - Creating a Backstage Plugin](https://backstage.io/docs/plugins/create-a-plugin)
* [Plugins - Plugin Development](https://backstage.io/docs/plugins/plugin-development)

## Code style and linting

GeoPortia uses [Prettier](https://prettier.io/) to enforce a consistent code style, and [ESLint](https://eslint.org/).

Code style and linting is automatically checked in the CI/CD pipeline, and must pass before code can be merged.

## General architectural guidelines

### Connection to external services

A huge part of GeoPortia is the connection to external services, such as data stores and web maps. In order to reduce
the risks involved in this (such as changes in external services breaking GeoPortia) and to ensure clean code in
GeoPortia all interaction with external services should be done through abstractions (usually a class) that provides
a type-safe interface to the service for the other parts of GeoPortia to interact through.

#### Examples

* [fmeflow-api-client-node](./fmeflow-api-client-node/src/index.ts)
* [geoserver-node-client](https://github.com/sweco-se1g7y/geoserver-node-client/tree/typescript/src)

### Reusability of libraries

Code parts that can be valuable to be reused in other projects should be extracted to separate libraries, preferably in
their own repository.

### Modularity

One of the primary goals in the creation of GeoPortia is modularity, so that it can be adapted for usage in different
technical landscapes. Therefore, dependencies between plugins have to be avoided (except to plugins that are
intended to be used by other plugins).
