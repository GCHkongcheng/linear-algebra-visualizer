import { expect, test } from "@playwright/test";

test("function experiment parameters stay compact and expose action dropdown", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "方程与逼近" }).click();
  await page.getByRole("button", { name: "插值与逼近 数据点、曲线与误差" }).click();
  await page.getByRole("tab", { name: "参数" }).click();
  await page.getByRole("button", { name: "函数实验" }).click();

  await expect(page.getByRole("heading", { name: "实验参数" })).toBeVisible();
  await expect(page.getByRole("button", { name: "计算" })).toBeVisible();
  await expect(page.getByText("函数实验参数")).toHaveCount(0);
  await expect(page.getByText("计算当前节点")).toHaveCount(0);
  await expect(page.getByText("Chebyshev 节点数 n")).toHaveCount(0);

  const actionSelect = page.getByLabel("函数实验操作");
  await expect(actionSelect).toBeVisible();
  await actionSelect.selectOption("uniformNodes");
  await expect(page.getByText("已生成等距节点")).toBeVisible();
});
