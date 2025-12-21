#!/bin/bash

set -e

BRANCH="public"
TAG="edge"

if [ "$TAG" == "production" ]; then
    BUILD="Release"
else
    BUILD="Debug"
fi

ROOT=$(pwd)
SERVER="$ROOT/Server"
DEPOT="$ROOT/DepotDownloader"

CARBON_URL="https://github.com/CarbonCommunity/Carbon/releases/download/${TAG}_build/Carbon.Linux.${BUILD}.tar.gz"

echo "Server directory: $SERVER"
echo "DepotDownloader directory: $DEPOT"
echo "Root directory: $ROOT"
echo "Branch: $BRANCH"

mkdir -p "$SERVER"
mkdir -p "$DEPOT"

echo "Downloading Carbon from the '$TAG' tag for $BUILD build..."
curl -L -o "$ROOT/carbon.zip" "$CARBON_URL"

echo "Extracting Carbon..."
unzip -o "$ROOT/carbon.zip" -d "$SERVER"
rm "$ROOT/carbon.zip"

if [ ! -f "$DEPOT/DepotDownloader" ]; then
    echo "Downloading DepotDownloader..."
    DEPOT_URL="https://github.com/SteamRE/DepotDownloader/releases/download/DepotDownloader_3.4.0/DepotDownloader-linux-x64.zip"

    echo "Downloading from: $DEPOT_URL"
    curl -L -o "$ROOT/depot.zip" "$DEPOT_URL"

    echo "Extracting DepotDownloader..."
    unzip -o "$ROOT/depot.zip" -d "$DEPOT"
    rm "$ROOT/depot.zip"

    chmod +x "$DEPOT/DepotDownloader"
fi

echo "Downloading Rust server on $BRANCH branch via DepotDownloader..."
cd "$DEPOT"

./DepotDownloader -app 258550 -branch "$BRANCH" -max-downloads 14 -dir "$SERVER"

cd "$SERVER"
echo "Starting server..."

export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:${SERVER}/RustDedicated_Data/Plugins/x86_64"
export TERM=xterm

source "carbon/tools/environment.sh"

chmod +x RustDedicated

./RustDedicated -batchmode -nographics -logs -silent-crashes \
    -server.hostname "Generator" \
    -server.identity "generator" \
    -server.saveinterval 400 \
    -server.maxplayers 1 \
    -chat.serverlog 1 \
    -global.asyncwarmup 1 \
    -global.skipassetwarmup_crashes 0 \
    -aimanager.nav_disable 1 \
    +server.seed 123123 \
    +server.worldsize 1500 \
    -logfile 2>&1

exit 0
