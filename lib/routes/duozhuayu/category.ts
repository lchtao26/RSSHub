import { Route } from '@/types';
import { getCurrentPath } from '@/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

import puppeteer from '@/utils/puppeteer';
import { art } from '@/utils/render';
import path from 'node:path';
import type { Context } from 'hono';
import { removeSearchParams } from './utils/link';
export const route: Route = {
    path: '/book-categories/:categoryId/:subCategoryId?',
    categories: ['shopping'],
    example: '/duozhuayu/book-categories/750409452376692948',
    parameters: {
        categoryId: '分类 ID，可在 URL 中找到',
        subCategoryId: '子分类 ID，可在 URL 中找到，可选',
    },
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
            source: ['duozhuayu.com/book-categories/:categoryId', 'duozhuayu.com/book-categories/:categoryId?subCategoryId=:subCategoryId'],
            target: '/book-categories/:categoryId/:subCategoryId?',
        },
    ],
    name: '图书分类',
    maintainers: ['fengkx'],
    handler,
    description: `:::tip
带有子分类的订阅格式: \`/duozhuayu/book-categories/分类ID/子分类ID\`
:::

例如: [科幻 - 多抓鱼](https://www.duozhuayu.com/book-categories/750409452376692948?subCategoryId=767083323578261442) 对应路由为: \`/duozhuayu/book-categories/750409452376692948/767083323578261442\``,
};

async function handler(ctx: Context) {
    const categoryId = ctx.req.param('categoryId');
    const subCategoryId = ctx.req.param('subCategoryId');

    const baseUrl = 'https://www.duozhuayu.com';
    let link = `${baseUrl}/book-categories/${categoryId}`;

    if (subCategoryId) {
        link = `${baseUrl}/book-categories/${categoryId}?subCategoryId=${subCategoryId}`;
    }

    const browser = await puppeteer();
    const page = await browser.newPage();

    // Set a longer timeout
    await page.setDefaultNavigationTimeout(30000);

    await page.goto(link, {
        waitUntil: 'networkidle2',
    });

    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Wait a bit more to ensure dynamic content is loaded
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const { items, title } = await page.evaluate(() => {
        // Get the page title
        const title = document.title || '多抓鱼图书分类';
        const debug = { selectors: {}, html: '' };

        // Try different selectors for book items
        const selectors = ['.jsx-1569806635.book-item', '.book-item', '[class*="book-item"]', '.main', 'a[href*="/books/"]'];

        let bookElements: Element[] = [];
        for (const selector of selectors) {
            const elements = [...document.querySelectorAll(selector)];
            debug.selectors[selector] = elements.length;
            if (elements.length > 0) {
                bookElements = elements;
                break;
            }
        }

        // If still no books found, get a sample of the HTML for debugging
        if (bookElements.length === 0) {
            debug.html = document.body.innerHTML.substring(0, 1000);
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
                    comment: '',
                    user: '',
                    dateText: '',
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

            // Extract comment if available
            const commentSection = book.closest('.jsx-1569806635')?.nextElementSibling;
            const commentElement = commentSection?.querySelector('.reason');
            const comment = commentElement ? commentElement.textContent || '' : '';

            // Extract user info if available
            const userElement = commentSection?.querySelector('.name');
            const user = userElement ? userElement.textContent || '' : '';

            // Extract date if available
            const dateElement = commentSection?.querySelector('.comment-footer span');
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
        return { items, title, debug };
    });

    await browser.close();

    if (items.length === 0) {
        throw new Error('This route is empty, please check the original site');
    }

    return {
        title,
        description: title,
        link,
        item: items.map((item) => ({
            title: item.title,
            link: removeSearchParams(item.link),
            description: art(path.join(__dirname, 'templates/category-book.art'), { item }),
        })),
    };
}
