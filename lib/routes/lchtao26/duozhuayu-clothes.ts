import { Route } from '@/types';
import puppeteer from '@/utils/puppeteer';
import { removeSearchParams } from './utils';
import { Clothe } from './clothe/interface';
import { render } from './clothe/render';

export const route: Route = {
    path: '/duozhuayu-clothes/:keyword',
    categories: ['shopping'],
    example: '/lchtao26/duozhuayu-clothes/男装',
    parameters: { keyword: '搜索关键词' },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '多抓鱼服饰',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
        const keyword = ctx.req.param('keyword');
        const baseUrl = 'https://www.duozhuayu.com';
        const link = `${baseUrl}/search/clothing/${keyword}?genderList=male`;

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

                // Extract image
                const imgElement = item.querySelector('.image-container .root');
                const imgStyle = imgElement ? imgElement.getAttribute('style') : '';
                const imgMatch = imgStyle ? imgStyle.match(/url\("([^"]+)"\)/) : null;
                const imgUrl = imgMatch ? imgMatch[1] : '';

                return {
                    title,
                    link,
                    brand,
                    price,
                    imgUrl,
                };
            });
            return { items, title };
        });

        await browser.close();

        return {
            title,
            description: title,
            link,
            item: items.map((item) => {
                const clothe: Clothe = {
                    id: item.link.split('/').pop() || '',
                    title: item.title,
                    url: removeSearchParams(item.link),
                    coverUrl: item.imgUrl,
                    brand: item.brand,
                    price: item.price,
                };

                return {
                    title: `${clothe.brand} - ${clothe.title}`,
                    link: clothe.url,
                    description: render(clothe),
                };
            }),
        };
    },
};
