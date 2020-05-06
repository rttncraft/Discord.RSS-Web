# Discord.RSS Web

A web app for https://github.com/synzen/Discord.RSS to manage your feeds. The backend is built with Express with server-side sessions, and a RESTful API. The front end is built with create-react-app (in ./client folder), with Redux and React Router. User authentication is done via Discord's OAuth2.



### Usage

All documentation can be found at https://docs.discordrss.xyz/.

This repo is for the development of the app, and the maintenance of the Docker image. For the main npm bot repository, see https://github.com/synzen/Discord.RSS. 

For personal non-programmatic use via cloning, use the repo at https://github.com/synzen/Discord.RSS-Clone.


# Preview

Mobile responsive UI, built according to Discord's theme with Discord's blessing

![UI Screenshot](https://i.imgur.com/CD8mbRh.png)

# Development:

### Backend

1. `npm install` in this directory to install backend requisites
2. Set up variables under web configuration in config.json
   - `config.bot.token` (Bot token)
   - `config.bot.clientID` (Bot Client ID)
   - `config.bot.clientSecret` (Bot Client Secret)
   - `config.bot.redirectURI` (Discord OAuth2 Redirect URI - set to http://domain.xyz/authorize - replace domain what whatever yours is)
3. Start the bot normally (`node server`)

### Frontend

1. `npm install` in ./client to install frontend requisites
2. Make sure the proxy's URL port for create-react-app in ./client/package.json is set to `config.http.port`
3. If developing the Control Panel which requires OAuth2 authentication, you must authenticate yourself via the following steps:
    - Make sure the backend is running
    - Go to http://localhost:SERVER_PORT/login, replacing `SERVER_PORT` replaced with whatever you set in `config.http.port`
    - Authorize application to Discord
4. `npm start` in ./client
5. Go to http://localhost:3000 (as specified in the npm start section of [web/client/README.md](https://github.com/synzen/Discord.RSS/blob/dev/web/client/README.md)). This is the development version over the server, not the built one.
6. Edit the files in src/js folder
7. When finished editing, publish the development files with `npm run build` in ./client.
8. The changes are now built and live on https://localhost:SERVER_PORT where `SERVER_PORT` = `config.http.port`


Note that if you don't do step 5, the files being served are NOT from the webpack dev server - it's from the built files from `npm run build`. For live changes, make sure to do step 5.

## API Tests

Run `npm test`
