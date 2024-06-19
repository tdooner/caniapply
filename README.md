This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

## TODO list
* Add testing
* Set up cron job to ping all systems periodically

* Fix dev env so fonts work for the nvim tree plugin
