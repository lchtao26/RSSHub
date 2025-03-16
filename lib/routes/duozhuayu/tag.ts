import { Route } from '@/types';
import { getCurrentPath } from '@/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

import puppeteer from '@/utils/puppeteer';
import { art } from '@/utils/render';
import path from 'node:path';
import type { Context } from 'hono';
import { removeSearchParams } from './utils/link';

export const route: Route = {
    path: '/tags/:id',
    categories: ['shopping'],
    example: '/duozhuayu/tags/960494709850119556',
    parameters: { id: '标签 ID，可在 URL 中找到' },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['duozhuayu.com/tag/:id'],
        },
    ],
    name: '标签',
    maintainers: ['fengkx'],
    handler,
};

async function handler(ctx: Context) {
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
                    publisher: '',
                    publishDate: '',
                    price: '',
                    imgUrl: '',
                    comment: '',
                    user: '',
                    dateText: '',
                };
            }

            const linkElement = bookItem.querySelector('a');
            const link = linkElement ? linkElement.href : '';

            const titleElement = bookItem.querySelector('.title');
            const title = titleElement ? titleElement.textContent || '' : '';

            // Extract book metadata
            const metaItems = [...bookItem.querySelectorAll('.info')];
            const author = metaItems[0]?.textContent || '';
            const publisher = metaItems[1]?.textContent || '';
            const publishDate = metaItems[2]?.textContent || '';

            // Extract price
            const priceElement = bookItem.querySelector('.Price');
            const price = priceElement ? priceElement.textContent || '' : '';

            // Extract image
            const imgElement = bookItem.querySelector('.img');
            const imgStyle = imgElement ? imgElement.getAttribute('style') : '';
            const imgMatch = imgStyle ? imgStyle.match(/url\("([^"]+)"\)/) : null;
            const imgUrl = imgMatch ? imgMatch[1] : '';

            // Extract comment if available
            const commentElement = book.querySelector('.reason');
            const comment = commentElement ? commentElement.textContent || '' : '';

            // Extract user info if available
            const userElement = book.querySelector('.name');
            const user = userElement ? userElement.textContent || '' : '';

            // Extract date if available
            const dateElement = book.querySelector('.comment-footer span');
            const dateText = dateElement && dateElement.textContent ? dateElement.textContent.trim() : '';

            return {
                title,
                link,
                author,
                publisher,
                publishDate,
                price,
                imgUrl,
                comment,
                user,
                dateText,
            };
        });
        return { items, title };
    });

    await browser.close();

    return {
        title,
        description: title,
        link,
        item: items.map((item) => ({
            title: item.title,
            link: removeSearchParams(item.link),
            description: art(path.join(__dirname, 'templates/tag-book.art'), { item }),
        })),
    };
}
