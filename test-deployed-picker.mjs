import { chromium } from "playwright";
import fs from "node:fs";

const envText = fs.readFileSync(".env", "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^"|"$/g, "")];
    }),
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

console.log("1. acessando o site publicado...");
await page.goto("https://outofserver.netlify.app/login", { waitUntil: "networkidle", timeout: 30000 });
await page.screenshot({ path: "test-deployed-1-login.png" });

await page.getByPlaceholder("Senha").fill(env.VITE_SITE_PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "test-deployed-2-after-login.png" });
console.log("URL após login:", page.url());

const errorText = await page.locator(".error").textContent().catch(() => null);
if (errorText) console.log("mensagem de erro na tela:", errorText);

console.log("\n2. abrindo Personagens > Novo personagem...");
await page.getByText("Ayla", { exact: true }).click();
await page.waitForURL("**/perfis/**");
await page.getByRole("link", { name: "Personagens" }).click();
await page.getByRole("button", { name: "Novo personagem" }).click();
await page.waitForTimeout(1500);

console.log("3. buscando 'Pugilist' em Classe...");
const classInput = page.locator(".classes-input-row input").first();
await classInput.fill("Pugilist");
await page.waitForTimeout(500);
const classOptions = await page.locator(".classes-input-row .source-picker-list li").allTextContents();
console.log("resultado 'Pugilist':", classOptions);

console.log("\n4. buscando 'Erina' em Raça...");
const raceInput = page.locator(".origin-picker:has(label:text('Raça')) input");
await raceInput.fill("Erina");
await page.waitForTimeout(500);
const raceOptions = await page.locator(".origin-picker:has(label:text('Raça')) .source-picker-list li").allTextContents();
console.log("resultado 'Erina':", raceOptions);

console.log("\n--- erros de console ---");
console.log(errors.join("\n") || "(nenhum)");

await browser.close();
