// 筹码：每人本金 ¥5,000，规则里的 1 分折合 ¥10（最小单位）。对局引擎只算分，这里换算成钱。

export const STAKE = 5000;
export const UNIT = 10;

const group = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 分 → 钱。 */
export const yuan = (points: number) => points * UNIT;

/** ¥5,000；负数是 -¥120。 */
export function money(amount: number) {
  return `${amount < 0 ? "-" : ""}¥${group(amount)}`;
}

/** 带正负号的输赢：+¥30、-¥30、¥0。 */
export function signedMoney(points: number) {
  const a = yuan(points);
  return a > 0 ? `+${money(a)}` : money(a);
}

/** 累计分 → 当前筹码余额。 */
export const balance = (totalPoints: number) => STAKE + yuan(totalPoints);
