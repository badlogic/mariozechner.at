#!/bin/bash
set -e
rm -rf html
blargh --in src --out html
host=slayer.marioslab.io
host_dir=/home/badlogic/mariozechner.at
current_date=$(date "+%Y-%m-%d %H:%M:%S")
commit_hash=$(git rev-parse HEAD)
echo "{\"date\": \"$current_date\", \"commit\": \"$commit_hash\"}" > html/version.json

ssh -t $host "mkdir -p $host_dir/docker/data/postgres"
rsync -avz --exclude node_modules --exclude .git --exclude data --exclude docker/data ./ $host:$host_dir

if [ "$1" == "server" ]; then
    echo "Publishing client & server"

    if [ -z "$TWITTER_API_KEY" ] && [ -z "$TWITTER_BEARER_TOKEN" ]; then
        echo "TWITTER_API_KEY or TWITTER_BEARER_TOKEN must be set when publishing the server"
        exit 1
    fi

    remote_env=""
    if [ -n "$TWITTER_API_KEY" ]; then
        remote_env="$remote_env TWITTER_API_KEY=$(printf "%q" "$TWITTER_API_KEY")"
    fi
    if [ -n "$TWITTER_BEARER_TOKEN" ]; then
        remote_env="$remote_env TWITTER_BEARER_TOKEN=$(printf "%q" "$TWITTER_BEARER_TOKEN")"
    fi

    ssh -t $host "cd $host_dir && ./docker/control.sh stop && $remote_env ./docker/control.sh start && ./docker/control.sh logs"
else
    echo "Publishing client only"
fi