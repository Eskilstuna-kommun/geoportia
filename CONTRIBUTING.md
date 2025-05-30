# Contributing to GeoPortia

Thank you for your interest in contributing to this project, we appreciate any contributions. Read through this document
to make the process as seamless as possible. Also keep in mind that these are just guidelines and not set rules, so do
not feel discouraged to contribute if you do not follow all the guidelines to the letter.

## Submitting bug reports or feature requests

Please use the [GitHub issue tracker](https://github.com/Eskilstuna-kommun/geoportia/issues) for reporting bugs and
feature requests. Before creating a new issue, do a search to see if the problem/request already has been posted by
another user. We do our best to respond to all incoming issues.

### Tips for creating a good bug report

 * Use a descriptive title.
 * Describe the steps you need to take in order to encounter the bug.
 * Explain what you expected to happen, and what happened instead.
 * What version of GeoPortia were you using?
 * What operating system and web browser were you using?
 * How are you hosting GeoPortia (operating system, Docker, etc.)?
 * Feel free to include screenshots or other relevant files.

### Feature requests

 * Can be completely new functionality, or improvement of some existing function.
 * Be comprehensive when you describe the new feature.
 * Motivate why the request should be added to GeoPortia.

## Contributing code

In this project we strive for modularity and flexibility. If you are interested in developing new features or fixing
bugs, take a look in the [`README.md`](./README.md) to get an
overview, and in [`DEVELOPING.md`](./DEVELOPING.md) for the development
specific guidelines.

Read through the guidelines below before you start coding.

If you are planning to contribute code to the project, open a new issue describing what you intend to fix or add. You
will get a response from at least one of the core developers who will let you know if you can go ahead and submit a
[pull request](https://github.com/Eskilstuna-kommun/geoportia/pulls). If your code is accepted by the core developers
and is deemed to meet the guidelines, it will be merged.

This project strives to have a linear history, and therefore does not allow merge commits. Instead, we use rebasing to
ensure that our commit history is clean and linear.

### Pull request guidelines

Your pull request should:

* Follow the [`DEVELOPING.md`](./DEVELOPING.md) guidelines.
* Target a single issue, or add single item of functionality to GeoPortia.
* Have accompanying documentation.
* Use clear and concise commit messages.
* Have commits that are logical, incremental and easy to follow. Use git rebase on your local code if needed to clean up
  the commit history, prior to creating the pull request.
* Be able to merge without conflicts.

### Commit messages guidelines

Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

* Start your commit message with a type, e.g. `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`, or `refactor:`.
* Use a short, clear description after the type, separated by a colon and a space.
  * Example: `fix: handle null values in user input`
* Optionally include a scope in parentheses after the type, e.g. `feat(parser):`.
  * Example: `feat(parser): add support for new syntax`
  * The scope can for example be the name of a plugin.
* Use the body (optional) for more details, separated by a blank line.
* Reference issues by number if relevant, e.g. `fix: update API endpoint (#123)`
* Use the `BREAKING CHANGE:` prefix in the body for breaking changes.
