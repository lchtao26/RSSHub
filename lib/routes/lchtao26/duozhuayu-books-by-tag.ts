import { Route } from '@/types';
import puppeteer from '@/utils/puppeteer';
import { removeSearchParams } from './utils';
import { Book } from './book/interface';
import { render } from './book/render';

export const route: Route = {
    path: '/duozhuayu-books-by-tag/:id',
    categories: ['shopping', 'reading'],
    example: '/lchtao26/duozhuayu-books-by-tag/960494709850119556',
    parameters: { id: '标签 ID，可在 URL 中找到' },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '多抓鱼标签书籍',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
        const id = ctx.req.param('id');
        const baseUrl = 'https://www.duozhuayu.com';
        const link = `${baseUrl}/tags/${id}`;

        const browser = await puppeteer();
        const page = await browser.newPage();
        await page.goto(link, {
            waitUntil: 'networkidle2',
        });

        const { items, title } = await page.evaluate(() => {
            // Get the page title
            const title = document.title || `多抓鱼 - ${id}`;

            const books = [...document.querySelectorAll('.book-item-wrap')];
            const items = books.map((book) => {
                const bookItem = book.querySelector('.book-item');
                if (!bookItem) {
                    return {
                        title: '',
                        link: '',
                        author: '',
                        imgUrl: '',
                        comment: '',
                    };
                }

                const linkElement = bookItem.querySelector('a');
                const link = linkElement ? linkElement.href : '';

                const titleElement = bookItem.querySelector('.title');
                const title = titleElement ? titleElement.textContent || '' : '';

                // Extract book metadata
                const metaItems = [...bookItem.querySelectorAll('.info')];
                const author = metaItems[0]?.textContent || '';

                // Extract image
                const imgElement = bookItem.querySelector('.img');
                const imgStyle = imgElement ? imgElement.getAttribute('style') : '';
                const imgMatch = imgStyle ? imgStyle.match(/url\("([^"]+)"\)/) : null;
                const imgUrl = imgMatch ? imgMatch[1] : '';

                // Extract comment if available
                const commentElement = book.querySelector('.reason');
                const comment = commentElement ? commentElement.textContent || '' : '';

                return {
                    title,
                    link,
                    author,
                    imgUrl,
                    comment,
                };
            });
            return { items, title };
        });

        await browser.close();

        return {
            title,
            link,
            item: items.map((item) => {
                const book: Book = {
                    id: item.link.split('/').pop() || '',
                    title: item.title,
                    url: removeSearchParams(item.link),
                    coverUrl: item.imgUrl,
                    description: item.comment,
                    author: item.author,
                };

                return {
                    title: book.title,
                    link: book.url,
                    description: render(book),
                    author: book.author,
                };
            }),
        };
    },
};
