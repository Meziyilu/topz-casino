// 判斷每個號碼的屬性與版面區塊
export type WheelNumber = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36;

export const RED_SET = new Set<WheelNumber>([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const BLACK_SET = new Set<WheelNumber>([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

export function isRed(n: WheelNumber){ return RED_SET.has(n); }
export function isBlack(n: WheelNumber){ return BLACK_SET.has(n); }
export function isOdd(n: WheelNumber){ return n!==0 && n%2===1; }
export function isEven(n: WheelNumber){ return n!==0 && n%2===0; }
export function isLow(n: WheelNumber){ return n>=1 && n<=18; }
export function isHigh(n: WheelNumber){ return n>=19 && n<=36; }

export function dozenIndex(n: WheelNumber): 0|1|2|-1 {
  if(n===0) return -1;
  if(n<=12) return 0;
  if(n<=24) return 1;
  return 2;
}
export function columnIndex(n: WheelNumber): 0|1|2|-1 {
  if(n===0) return -1;
  const mod = n%3;
  if(mod===1) return 0; // 第一行
  if(mod===2) return 1; // 第二行
  return 2;             // 第三行
}
