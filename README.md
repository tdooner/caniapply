# Can I Apply?
Every American should be able to apply for government benefits at any time of day. Government website "business hours" and "planned maintenance" outages should never prevent someone from applying for help that they need.

This application tests [all known government benefit applications][1] every 15 minutes to see if they are currently operational.

## Getting Started

First, run the development server:

```bash
nodenv install
npm run dev

brew tap render-oss/render
brew install render

# Ubuntu:
f=~/bin/render; wget -O $f https://github.com/render-oss/render-cli/releases/download/v0.1.11/render-linux-x86_64 ; chmod +x $f

# Install Chrome:
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb && rm ./google-chrome-stable_current_amd64.deb

# Install Chromedriver:
# https://googlechromelabs.github.io/chrome-for-testing/#stable
wget https://storage.googleapis.com/chrome-for-testing-public/126.0.6478.62/linux64/chromedriver-linux64.zip
unzip chromedriver-linux64.zip
sudo mv chromedriver-linux64/chromedriver /usr/local/bin
```

## Get a copy of the database
Get the External Database URL from the database on https://dashboard.render.com/
```bash
PRODUCTION_DATABASE_URL="postgres://..."
dropdb caniapply_development
createdb caniapply_development
pg_dump --no-owner --no-privileges $PRODUCTION_DATABASE_URL | psql caniapply_development
```

## TODO list
* Add testing
* Fix dev env so fonts work for the nvim tree plugin
* Take screenshots of outages or when the page size differs by >15% (TBD figure out what this threshold should be)
* Install some kind of frontend framework so it doesn't look so ugly

[1]: https://github.com/tdooner/caniapply/blob/main/systems.yaml
