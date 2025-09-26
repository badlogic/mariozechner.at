function dom(html) {
    const div = document.createElement(`div`);
    div.innerHTML = html;
    const children = [];
    for (let i = 0; i < div.children.length; i++) {
        children.push(div.children[i]);
    }
    return children;
}

class ThemeToggle extends HTMLElement {
    darkIcon = `<%= render("./_icons/moon-line.svg")%>`;
    lightIcon = `<%= render("./_icons/sun-line.svg")%>`;

    connectedCallback() {
        this.render();
        this.style.cursor = "pointer";
    }

    render() {
        this.innerHTML = "";
        const elements = dom(/*html*/ `
        <i class="icon" style="width: 20px;">${
            localStorage.getItem("theme") === "dark" ? this.darkIcon : this.lightIcon
        }</i>
      `);
        this.append(...elements);

        elements[0].addEventListener("click", () => {
            localStorage.setItem("theme", localStorage.getItem("theme") === "dark" ? "light" : "dark");
            document.documentElement.setAttribute("data-theme", localStorage.getItem("theme"));
            this.render();
        });
    }
}
customElements.define("theme-toggle", ThemeToggle);
if (!localStorage.getItem("theme")) {
    localStorage.setItem("theme", "dark");
}
document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") ?? "light");

class ColorBand extends HTMLElement {
    connectedCallback() {
        this.style.display = "block";
        this.innerHTML = /*html*/ `<canvas class="w-full h-full"></canvas>`;

        let colors = [
            "#fe8242",
            "#dd3c5a",
            "#aa3e6c",
            "#fe5d45",
            "#fe9840",
            "#893062",
            "#fd3e4a",
            "#c04267",
            "#ef4159",
            "#fd4d3d",
            "#feab40",
            "#d0486a",
        ];

        const brightness = (color) => {
            const [r, g, b] = color.match(/\w\w/g)?.map((hex) => parseInt(hex, 16)) || [];
            return (r * 299 + g * 587 + b * 114) / 1000;
        };

        colors = colors.sort((a, b) => brightness(b) - brightness(a));

        const canvas = this.querySelector("canvas");
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas?.getContext("2d");
        if (ctx) {
            const { width, height } = canvas;
            const barHeight = (height / colors.length) | 0;

            colors.forEach((color, index) => {
                const barWidth = width * 0.4; // Each bar is 40% of the canvas width
                const xOffset = width - barWidth - (index * (width - barWidth)) / (colors.length - 1); // Calculate X offset
                ctx.fillStyle = color;
                ctx.fillRect(
                    xOffset + Math.random() * width * 0.1 - Math.random() * width * 0.1,
                    index * barHeight,
                    barWidth,
                    2
                );
            });
        }
    }
}
customElements.define("color-band", ColorBand);

class QuoteLink extends HTMLElement {
    quotesIcon = `<%= render("./_icons/double-quotes-r.svg")%>`;

    constructor() {
        super();
        this.href = "";
    }

    static get observedAttributes() {
        return ["href"];
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        if (name === "href") {
            this.href = newValue;
            this.render();
        }
    }

    connectedCallback() {
        this.style.display = "inline-flex";
        this.render();
    }

    render() {
        this.innerHTML = `
        <a href="${this.href}" class="inline-flex items-baseline" style="color: var(--link-color); font-size: 12px; transform: translateY(-6px);">
          <span>[</span>
          <i class="icon" style="width: 12px;">${this.quotesIcon}</i>
          <span>]</span>
        </a>
      `;
    }
}

customElements.define("q-l", QuoteLink);
