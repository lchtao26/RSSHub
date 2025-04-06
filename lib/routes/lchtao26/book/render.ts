import { Book } from './interface';

export function render(book: Book) {
    return `
        ${book.coverUrl ? `<img src="${book.coverUrl}" style="max-width: 150px; height: auto;"><br>` : ''}
        书名：${book.title}<br>
        ${book.author ? `作者：${book.author}<br>` : ''}
        ${book.description ? `简介：${book.description}<br>` : ''}
        ${book.rating ? `评分：${book.rating}<br>` : ''}
        <a href="${book.url}">查看详情</a>
    `.trim();
}
