import { Clothe } from './interface';

export const render = (clothe: Clothe) => `
<img src="${clothe.coverUrl}"><br>
品牌：${clothe.brand}<br>
名称：${clothe.title}<br>
价格：${clothe.price}
`;
