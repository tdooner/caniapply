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
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Headless browser setup
1. Install firefox (on WSL, use [this](https://ubuntuhandbook.org/index.php/2022/04/install-firefox-deb-ubuntu-22-04/))
2. sudo apt install firefox-geckodriver

## TODO list
* Add testing
* Set up cron job to ping all systems periodically

* Fix dev env so fonts work for the nvim tree plugin
