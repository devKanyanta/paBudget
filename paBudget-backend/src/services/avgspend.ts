const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const isDrink = (n: string) => /drink|beverage|juice|soda|coffee|tea|beer|wine|cocktail/i.test(n);
const isMain = (n: string) => /main|meal|burger|pizza|chicken|grill|lunch|dinner|breakfast|combo/i.test(n) && !isDrink(n);

/** Typical spend per person: median main + median drink, else 2x the median item price. */
export function computeAvgSpend(items: { price: number; section: string }[]) {
  const mains = items.filter((i) => isMain(i.section)).map((i) => i.price);
  const drinks = items.filter((i) => isDrink(i.section)).map((i) => i.price);
  return mains.length && drinks.length ? median(mains) + median(drinks) : median(items.map((i) => i.price)) * 2;
}
