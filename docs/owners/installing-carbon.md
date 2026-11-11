# ⚙ Installing Carbon

## Getting started

To get started, please follow the following instructions underneath, specified for the operating system of your liking:

<iframe
width="100%"
height="388"
src="https://www.youtube-nocookie.com/embed/htfazTbNsPs"
title="YouTube video player"
frameborder="0"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
referrerpolicy="strict-origin-when-cross-origin"
allowfullscreen></iframe>

:::tabs
== Windows
To install **Carbon** on your Windows dedicated Rust server, you must follow these steps:

Please verify all server files and keep the server up to date every time it boots up.

1. Go to the GitHub [Releases page](https://github.com/CarbonCommunity/Carbon/releases) and download the latest
   `Carbon.Windows.TARGET.zip`.
2. Unpack the archive in the root folder of your server; extract all files the same way they're presented in the
   archive, on top of the folder where `RustDedicated.exe` exists.
3. Launch the server as you normally would, with your shell/batch command line instructions.
4. **You're good to go!**

:::tip
`TARGET` can be `Release` or `Debug`, depending on the build branch you're using.
== Linux
To install **Carbon** on your Linux dedicated Rust server, you must follow these steps:

1. Download the latest `Carbon.Linux.TARGET.tar.gz` from the
   [GitHub Releases page](https://github.com/CarbonCommunity/Carbon/releases).
2. Unpack the archive in the root folder of your server
    1. Extract all files the same way they're presented in the archive, on top of the folder where `RustDedicated`
       exists
    2. From now on this directory will be named `[GAMEROOT]`.
3. In the launch file of your server, please have the following order of events:
    1. Verify and update game files to latest (usually using steamcmd)
    2. Load (i.e. `source`) the file `[GAMEROOT]/carbon/tools/environment.sh`
    3. Launch the server as you normally would i.e. `RustDedicated -batchmode ..`
4. **You're good to go!**

:::tip
For more information have a look at the
example [launcher script](https://github.com/CarbonCommunity/Carbon.QuickStart/blob/main/linux/run.sh).
On some distros and specially with docker you'll also need to `export TERM=xterm` before launching the server.
== OSX
_There's currently no support for the OSX operating system._

== Smart Fridge
_There's currently no support for any Smart Fridge systems._
:::
