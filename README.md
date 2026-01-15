## Getting Started
 
Follow these steps to set up and run the project:
 
### 1. Install dependencies
 
```bash
yarn install
```
 
The plugin code is automatically generated after install via a `postinstall` script.

You will require a number of devolpment environments for the build to be successful, including Python, C++, and Node.js. Install them as needed. Note that Node.js must be of version 22 or earlier; if you have a later version installed, we suggest using nvm to temporarily change to running an earlier version.

### 2. Kör generate-script

Navigera till plugins/geoportia-metadata-backend och kör följande kommando:

```bash
yarn generate
```

Kom ihåg att navigera tillbaka till rotkatalogen efteråt.

### 3. Generate GitHub OAuth credentials

To generate GitHub OAuth credentials, follow the official Backstage documentation:  
https://backstage.io/docs/auth/github/provider/

### 4. Add user to org.yaml

Add the GitHub account name used to generate the OAuth credentials to the /examples/org.yaml file. It should look like this:

```
---
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: YourGitHubUserName
spec:
  memberOf: [users]
---
```

### 5. Set up environment variables
 
Create a `.env` file inside the `packages/backend` directory with the following content:
 
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FMEFLOW_BASE_URL=your_fmeflow_base_url
FMEFLOW_TOKEN=your_fmeflow_token
FME_REPOSITORY_NAME=your_fme_repository_name
GEOSERVER_BASE_URL=http://localhost:18080/geoserver/rest/
GEOSERVER_USERNAME=admin
GEOSERVER_PASSWORD=geoserver
ARCPY_URI=http://127.0.0.1:8045
ARCPY_ADMIN_USER=someadmin
ARCPY_ADMIN_PASSWORD=somepassword
ARCPY_DATABASE=somedatabase
```

The your_github_client_id and your_github_client_secret should be from the previous step.

The your_fmeflow_base_url, your_fmeflow_token and your_fme_repository_name must be taken from an FME flow you supply yourself.
 
### 6. Start the Docker containers

If you do not have Docker Desktop, you must install it first. Then, you can spin up the containers used for testing with the following command:

```bash
docker compose -f 'docker-compose.yml' up -d --build 
```

### 7. Start the app
 
```bash
yarn dev
```
