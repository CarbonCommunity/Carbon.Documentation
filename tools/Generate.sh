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

echo "Downloading Carbon from the '$TAG' tag for $BUILD build, via $CARBON_URL ..."

echo "::group::Carbon Setup"

curl -L -o "$ROOT/carbon.tar.gz" "$CARBON_URL"

echo "Extracting Carbon..."
tar -xvf "$ROOT/carbon.tar.gz" -C "$SERVER"
rm "$ROOT/carbon.tar.gz"

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

echo "::endgroup::"

echo "Downloading Rust server on $BRANCH branch via DepotDownloader..."
cd "$DEPOT" || exit

echo "::group::DepotDownloader Download"

echo 'regex:^(?!.*/StreamingAssets/)(?!.*items/.*\.json$).*$' > filelist.txt

./DepotDownloader -app 258550 -branch "$BRANCH" -max-downloads 16 -filelist "filelist.txt" -dir "$SERVER"

echo "::endgroup::"

cd "$SERVER" || exit
echo "Starting server..."

export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:${SERVER}/RustDedicated_Data/Plugins/x86_64"
export TERM=xterm

source "carbon/tools/environment.sh"

chmod +x RustDedicated

set +e

echo "::group::Server Run"

./RustDedicated -batchmode -nographics -logs -silent-crashes \
    -server.hostname "Generator" -server.identity "generator" \
    -server.maxplayers 1 -chat.serverlog 1 \
    -app.port 1- \
    -aimanager.nav_disable 1 \
    -disable-server-occlusion -disable-server-occlusion-rocks -disableconsolelog -skipload -noconsole \
    +server.level "CraggyIsland" -insecure \
    -logfile 2>&1

echo "::endgroup::"

EXIT_CODE=$?

set -e

if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 137 ]; then
    echo "Server finished (Exit code: $EXIT_CODE). Treating as success."
else
    echo "Server failed with unexpected exit code: $EXIT_CODE"
    exit $EXIT_CODE
fi

exit 0
