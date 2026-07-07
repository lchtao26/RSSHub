import type { Route } from '@/types';
import playwright from '@/utils/playwright';

import type { Book } from './book/interface';
import { render } from './book/render';
import { removeSearchParams } from './utils';

export const route: Route = {
    path: '/duozhuayu-books-by-keyword/:keyword?',
    categories: ['shopping', 'reading'],
    example: '/lchtao26/duozhuayu-books-by-keyword',
    parameters: { keyword: '搜索关键词，默认为空' },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '多抓鱼书籍',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
        const keyword = ctx.req.param('keyword') || '';
        const baseUrl = 'https://www.duozhuayu.com';
        const link = keyword ? `${baseUrl}/search/book/${keyword}` : `${baseUrl}/book`;

        const context = await playwright();
        const page = await context.newPage();
        await page.goto(link, {
            waitUntil: 'networkidle',
        });

        const { items, title } = await page.evaluate(() => {
            // Get the page title
            const title = document.title || `多抓鱼书籍 ${document.querySelector('.search-keyword')?.textContent || ''}`;

            const books = [...document.querySelectorAll('.book-feed-item')];
            const items = books.map((book) => {
                if (!book) {
                    return {
                        title: '',
                        link: '',
                        tags: [],
                        imgUrl: '',
                    };
                }

                const linkElement = book.querySelector('a');
                const link = linkElement ? linkElement.href : '';

                const titleElement = book.querySelector(':scope .content .title');
                const title = titleElement ? titleElement.textContent || '' : '';

                // Extract image - the structure is different than clothes
                let imgUrl = '';
                try {
                    const imgContainer = book.querySelector(':scope .book-cover .image');
                    if (imgContainer) {
                        const imgStyle = imgContainer.getAttribute('style');
                        if (imgStyle) {
                            const imgMatch = imgStyle.match(/url\("([^"]+)"\)/);
                            if (imgMatch && imgMatch[1]) {
                                imgUrl = imgMatch[1];
                            }
                        }
                    }
                } catch {
                    // If can't extract image, try an alternative method
                    const imgElement = book.querySelector(':scope .book-cover img');
                    if (imgElement) {
                        imgUrl = imgElement.getAttribute('src') || '';
                    }
                }

                // Extract tags
                const tagElements = book.querySelectorAll('.book-tag');
                const tags = [...tagElements].map((tag) => {
                    const tagText = tag.textContent || '';
                    return tagText.replace('#', '');
                });

                return {
                    title,
                    link,
                    tags,
                    imgUrl,
                };
            });
            return { items, title };
        });

        await context.close();

        return {
            title,
            description: title,
            link,
            item: items.map((item) => {
                const book: Book = {
                    id: item.link.split('/').pop()?.split('?', 1)[0] || '',
                    title: item.title,
                    url: removeSearchParams(item.link),
                    coverUrl: item.imgUrl,
                    description: item.tags.length > 0 ? `标签: ${item.tags.join(', ')}` : '',
                };

                return {
                    title: book.title,
                    link: book.url,
                    description: render(book),
                    allowEmpty: true,
                };
            }),
        };
    },
};
