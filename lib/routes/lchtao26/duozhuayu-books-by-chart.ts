import type { Route } from '@/types';
import playwright from '@/utils/playwright';

import type { Book } from './book/interface';
import { render } from './book/render';
import { removeSearchParams } from './utils';

export const route: Route = {
    path: '/duozhuayu-books-by-chart/:id',
    categories: ['shopping', 'reading'],
    example: '/lchtao26/duozhuayu-books-by-chart/765988201625163649',
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

        const context = await playwright();
        const page = await context.newPage();

        await page.setDefaultNavigationTimeout(30000);

        await page.goto(link, {
            waitUntil: 'networkidle',
        });

        await page.waitForSelector('body', { timeout: 10000 });

        // Wait for dynamic content to render
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const { items, title } = await page.evaluate((chartId) => {
            // Get the page title
            const title = document.title || `多抓鱼榜单 - ${chartId}`;

            const selectors = ['.book-item', '.chart-book-item', '[class*="book-item"]'];

            let bookElements: Element[] = [];
            for (const selector of selectors) {
                const elements = [...document.querySelectorAll(selector)];
                if (elements.length > 0) {
                    bookElements = elements;
                    break;
                }
            }

            const items = bookElements.map((book) => {
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
        }, id);

        await context.close();

        if (items.length === 0) {
            throw new Error('This route is empty, please check the original site');
        }

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
