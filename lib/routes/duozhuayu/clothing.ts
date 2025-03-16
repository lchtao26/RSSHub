import { Route } from '@/types';
import { getCurrentPath } from '@/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

import puppeteer from '@/utils/puppeteer';
import { art } from '@/utils/render';
import path from 'node:path';
import type { Context } from 'hono';
import { removeSearchParams } from './utils/link';

export const route: Route = {
    path: '/clothing/:keyword',
    categories: ['shopping'],
    example: '/duozhuayu/clothing/男装',
    parameters: { keyword: '搜索关键词' },
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
            source: ['duozhuayu.com/search/clothing/:keyword'],
        },
    ],
    name: '服饰搜索',
    maintainers: ['fengkx'],
    handler,
};

async function handler(ctx: Context) {
    const keyword = ctx.req.param('keyword');
    const baseUrl = 'https://www.duozhuayu.com';
    const link = `${baseUrl}/search/clothing/${keyword}`;

    const browser = await puppeteer();
    const page = await browser.newPage();
    await page.goto(link, {
        waitUntil: 'networkidle2',
    });

    const { items, title } = await page.evaluate(() => {
        // Get the page title
        const title = document.title || `多抓鱼服饰 - ${document.querySelector('.search-keyword')?.textContent || '搜索结果'}`;

        const clothingItems = [...document.querySelectorAll('.clothing-product-item')];
        const items = clothingItems.map((item) => {
            const linkElement = item.querySelector('a');
            const link = linkElement ? linkElement.href : '';

            // Extract brand
            const brandElement = item.querySelector('.brand');
            const brand = brandElement ? brandElement.textContent || '' : '';

            // Extract title
            const titleElement = item.querySelector('.title');
            const title = titleElement ? titleElement.textContent || '' : '';

            // Extract price
            const priceElement = item.querySelector('.Price');
            const price = priceElement ? priceElement.textContent || '' : '';

            // Extract discount if available
            const discountElement = item.querySelector('.Label');
            const discount = discountElement ? discountElement.textContent || '' : '';

            // Extract image
            const imgElement = item.querySelector('.image-container .root');
            const imgStyle = imgElement ? imgElement.getAttribute('style') : '';
            const imgMatch = imgStyle ? imgStyle.match(/url\("([^"]+)"\)/) : null;
            const imgUrl = imgMatch ? imgMatch[1] : '';

            // Extract recommendation sentence if available
            const recommendElement = item.querySelector('.recommend-sentence');
            const recommendSentence = recommendElement ? recommendElement.textContent || '' : '';

            return {
                title,
                link,
                brand,
                price,
                discount,
                imgUrl,
                recommendSentence,
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
            title: `${item.brand} - ${item.title}`,
            link: removeSearchParams(item.link),
            description: art(path.join(__dirname, 'templates/clothing-item.art'), { item }),
        })),
    };
}
