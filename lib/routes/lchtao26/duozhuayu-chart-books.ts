import { Route } from '@/types';
import puppeteer from '@/utils/puppeteer';
import { removeSearchParams } from './utils';
import { Book } from './book/interface';
import { render } from './book/render';

export const route: Route = {
    path: '/duozhuayu-chart-books/:id',
    categories: ['shopping', 'reading'],
    example: '/lchtao26/duozhuayu-chart-books/765988201625163649',
    parameters: { id: '榜单 ID，可在 URL 中找到' },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '多抓鱼榜单书籍',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
        const id = ctx.req.param('id');
        const baseUrl = 'https://www.duozhuayu.com';
        const link = `${baseUrl}/charts/${id}`;

        const browser = await puppeteer();
        const page = await browser.newPage();
        await page.goto(link, {
            waitUntil: 'networkidle2',
        });

        const { items, title } = await page.evaluate(() => {
            // Get the page title
            const title = document.title || `多抓鱼榜单 - ${id}`;

            const books = [...document.querySelectorAll('.book-item')];
            const items = books.map((book) => {
                if (!book) {
                    return {
                        title: '',
                        link: '',
                        author: '',
                        publisher: '',
                        publishDate: '',
                        price: '',
                        imgUrl: '',
                    };
                }

                const linkElement = book.querySelector('a');
                const link = linkElement ? linkElement.href : '';

                const titleElement = book.querySelector('.title');
                const title = titleElement ? titleElement.textContent || '' : '';

                // Extract book metadata
                const metaItems = [...book.querySelectorAll('.info')];
                const author = metaItems[0]?.textContent || '';
                const publisher = metaItems[1]?.textContent || '';
                const publishDate = metaItems[2]?.textContent || '';

                // Extract price
                const priceElement = book.querySelector('.Price');
                const price = priceElement ? priceElement.textContent || '' : '';

                // Extract image
                const imgElement = book.querySelector('.img');
                const imgStyle = imgElement ? imgElement.getAttribute('style') : '';
                const imgMatch = imgStyle ? imgStyle.match(/url\("([^"]+)"\)/) : null;
                const imgUrl = imgMatch ? imgMatch[1] : '';

                return {
                    title,
                    link,
                    author,
                    publisher,
                    publishDate,
                    price,
                    imgUrl,
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
                    description: `${item.author} | ${item.publisher} | ${item.publishDate} | ${item.price}`,
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
