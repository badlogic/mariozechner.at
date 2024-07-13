# mariozechner.at

Sources for [mariozechner.at](https://mariozechner.at). Built with [blargh](https://github.com/badlogic/blargh).

## Development
You'll need [node.js +20](https://nodejs.org).

Install `blargh`, clone the repo and open it in VS Code:

```
npm install -g @mariozechner/blargh
git clone https://github.com/badlogic/mariozechner.at
code mariozechner.at
```

Inside VS Code, open a `JavaScript Debug Terminal` and run `blargh --in src --out html --watch --serve 8080`. Open a browser and point it at [http://127.0.0.1:8080](http://127.0.0.1:8080). Change stuff in VS Code, watch opened pages in the browser auto-update.

`publish.sh` is intended for use with my infrastructure. If you fork this repo and adapt it for your own site, just push the `html/` folder to wherever you host your website.