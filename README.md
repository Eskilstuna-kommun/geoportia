# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

## Getting Started

Follow these steps to set up and run the project:

### 1. Install dependencies

```bash
yarn install
```

The plugin code is automatically generated after install via a `postinstall` script.

### 2. Set up environment variables

Create a `.env` file inside the `packages/backend` directory with the following content:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GEOSERVER_BASE_URL=http://localhost:18080/geoserver/rest/
GEOSERVER_USERNAME=admin
GEOSERVER_PASSWORD=geoserver
```

To generate GitHub OAuth credentials, follow the official Backstage documentation:  
https://backstage.io/docs/auth/github/provider/

### 3. Start the app

```bash
yarn dev
```
