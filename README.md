# Carbon.Documentation
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/CarbonCommunity/Carbon.Documentation)

[carbonmod.gg](https://carbonmod.gg/)

This is official repository for documentation of Carbon framework and other useful stuff.

The website is built using [VitePress](https://vitepress.dev/), powered by [Vite](https://vitejs.dev/) and [Vue.js](https://vuejs.org/). It uses [Tailwind CSS v3](https://v3.tailwindcss.com/) for styling.

## Dev Setup

### Recommended IDEs

1. **[VSCode](https://code.visualstudio.com/)** (or any fork of it) – currently has the best support for the packages used in this project: **Vue.js**, **Tailwind**.
2. **[WebStorm](https://www.jetbrains.com/webstorm/)** – can be used as an alternative to **VSCode**, but lacks some minor features.

### Setting up the server

1. Run `setup.bat` to install all dependencies.
2. Run `npm run docs:dev` to start the dev server, which will automatically apply any changes you make.
3. Run `npm run docs:build` to build the site (to ensure everything builds correctly and can be deployed to GitHub Pages without problems).
4. Run `npm run docs:preview` to preview the documentation built by the previous command.
