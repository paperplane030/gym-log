import type { Category } from './types'

/** 第一次登入時建立的預設動作，之後可以自由編輯或刪除 */
export const DEFAULT_EXERCISES: [string, Category][] = [
  ['槓鈴臥推', 'chest'],
  ['上斜啞鈴臥推', 'chest'],
  ['啞鈴飛鳥', 'chest'],
  ['雙槓撐體', 'chest'],
  ['引體向上', 'back'],
  ['滑輪下拉', 'back'],
  ['槓鈴划船', 'back'],
  ['坐姿划船', 'back'],
  ['硬舉', 'back'],
  ['槓鈴深蹲', 'legs'],
  ['腿推', 'legs'],
  ['羅馬尼亞硬舉', 'legs'],
  ['腿伸展', 'legs'],
  ['腿彎舉', 'legs'],
  ['保加利亞分腿蹲', 'legs'],
  ['站姿肩推', 'shoulders'],
  ['啞鈴側平舉', 'shoulders'],
  ['臉拉', 'shoulders'],
  ['槓鈴彎舉', 'arms'],
  ['錘式彎舉', 'arms'],
  ['三頭繩索下壓', 'arms'],
  ['捲腹', 'core'],
  ['懸垂舉腿', 'core'],
]
