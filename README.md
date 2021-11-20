# Lezer Sandbox

```sh
npm install
npm run dev
```

## GitHub Authentication

The sandbox can run without GitHub authentication, but will be limited to 60 API requests per hour.

To remove this restriction create a file, `.env.local`, and add the following content:

```sh
GITHUB_TOKEN=ghp_aey4BqmDbi
```

Replace `ghp_aey4BqmDbi` with a token from [github.com/settings/tokens](https://github.com/settings/tokens) (all permissions can be deselected, as the token is only used to access public APIs).
