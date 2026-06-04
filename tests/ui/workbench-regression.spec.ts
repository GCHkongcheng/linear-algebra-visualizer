import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("determinant module computes the default matrix and exposes validation", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "行列式 方阵体积因子与可逆性" })
    .click();
  await page.getByRole("button", { name: "计算行列式" }).click();

  await expect(page.getByText(/det\(A\)\s*=\s*-1/)).toBeVisible();

  await page.getByRole("tab", { name: "验证" }).click();
  await page.getByRole("button", { name: "开启正确性证据面板" }).click();
  await expect(page.getByText("行列式验证")).toBeVisible();
});

test("decomposition module computes default LU decomposition", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "矩阵分解 LU / QR / Cholesky / SVD" })
    .click();
  await page.getByRole("button", { name: "计算矩阵分解" }).click();

  await expect(page.getByText("LU 分解关系：P·A = L·U")).toBeVisible();
  await expect(page.getByText("L（下三角矩阵）")).toBeVisible();
  await expect(page.getByText("U（上三角矩阵）")).toBeVisible();

  await page.getByRole("tab", { name: "验证" }).click();
  await page.getByRole("button", { name: "开启正确性证据面板" }).click();
  await expect(page.getByText("分解正确性证据").first()).toBeVisible();
});

test("matrix library smart import can flow into determinant workspace", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "数据" }).click();
  await page.getByRole("button", { name: "智能识别" }).click();
  await page
    .getByPlaceholder("1,1;2,2;3,3  或  1,2|3;4,5|6")
    .fill("1,2;3,4");
  await page.getByRole("button", { name: "确认并生成可编辑矩阵" }).click();
  await page.getByRole("button", { name: "保存到矩阵库" }).click();

  await expect(page.getByText("识别矩阵", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "导航", exact: true }).click();
  await page
    .getByRole("button", { name: "行列式 方阵体积因子与可逆性" })
    .click();
  await page.getByRole("tab", { name: "数据" }).click();
  await page.getByRole("button", { name: "设为当前活动矩阵" }).click();
  await page.getByRole("button", { name: "计算行列式" }).click();

  await expect(page.getByText(/det\(A\)\s*=\s*-2/)).toBeVisible();
});

test("workbench history can undo and redo determinant input edits", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "行列式 方阵体积因子与可逆性" })
    .click();

  const firstCell = page.getByLabel("第 1 行, 第 1 列", { exact: true });
  await expect(firstCell).toHaveValue("2");

  await firstCell.fill("5");
  await expect(firstCell).toHaveValue("5");

  await page.keyboard.press("Control+Z");
  await expect(firstCell).toHaveValue("2");

  await page.keyboard.press("Control+Shift+Z");
  await expect(firstCell).toHaveValue("5");
});
