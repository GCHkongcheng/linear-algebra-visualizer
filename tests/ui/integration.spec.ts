import { expect, test } from "@playwright/test";

test("integration parameters include error limit and result exposes extrapolation sequence", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "积分与微分方程" }).click();
  await page.getByRole("button", { name: "数值积分 求积策略与误差估计" }).click();
  await page.getByRole("button", { name: "参数" }).click();
  await page.getByLabel("方法").selectOption("romberg");
  await page.getByLabel("误差限").fill("1e-10");
  await page.getByRole("button", { name: "计算" }).click();

  await expect(page.getByText("收敛控制：")).toBeVisible();
  await expect(page.getByRole("heading", { name: "外推序列" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "T_n" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "S_n" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "C_n" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "R_n" })).toBeVisible();
});
