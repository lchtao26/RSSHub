import { Route } from '@/types';
import puppeteer from '@/utils/puppeteer';
import { removeSearchParams } from './utils';
import { Book } from './book/interface';
import { render } from './book/render';

export const route: Route = {
    path: '/duozhuayu-books-by-category/:categoryId/:subCategoryId?',
    categories: ['shopping', 'reading'],
    example: '/lchtao26/duozhuayu-books-by-category/750409452376692948/767083323578261442',
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
    name: '多抓鱼分类书籍',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
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

            // Try different selectors for book items
            const selectors = ['.jsx-1569806635.book-item', '.book-item', '[class*="book-item"]', '.main', 'a[href*="/books/"]'];

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
            return { items, title };
        });

        await browser.close();

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
                    description: `${item.author} | ${item.publisher} | ${item.publishDate} | ${item.price}${item.comment ? `\n\n评论: ${item.comment} (${item.user} - ${item.dateText})` : ''}`,
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
