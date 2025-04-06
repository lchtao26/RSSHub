import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { Book } from './book/interface';
import { render } from './book/render';

const baseUrl = 'https://m.douban.com';

export const route: Route = {
    path: '/douban-monthly-books',
    categories: ['social-media', 'reading'],
    example: '/lchtao26/douban-monthly-books',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Douban Books Monthly',
    maintainers: ['lchtao26'],
    handler: async () => {
        const response = await fetchBooks();

        const items = response.subject_collection_items.map((item) => {
            const coverUrl = item.pic?.normal || item.cover_url || '';
            const rating = item.rating ? `${item.rating.value} (${item.rating.count}人评价)` : '暂无评分';

            const book: Book = {
                id: item.id,
                title: item.title || '未知标题',
                url: item.url || `${baseUrl}/book/subject/${item.id}/`,
                coverUrl,
                description: '',
                author: item.card_subtitle?.split('/')[0]?.trim() || '未知',
                rating,
            };

            return {
                title: book.title,
                link: book.url,
                description: render(book),
                author: book.author,
            };
        });

        return {
            title: '豆瓣读书月度热门',
            link: 'https://m.douban.com/subject_collection/book_hot_monthly',
            item: items,
        };
    },
};

export interface Response {
    count: number;
    subject_collection: Record<string, unknown>;
    subject_collection_items: Array<{
        comment: string;
        rating?: {
            count: number;
            max: number;
            star_count: number;
            value: number;
        };
        controversy_reason: string;
        rank_value: number;
        pic?: {
            large: string;
            normal: string;
        };
        rank: number;
        uri: string;
        other_versions_count: number;
        is_show: boolean;
        vendor_icons: string[];
        card_subtitle: string;
        book_subtitle: string;
        actions: string[];
        id: string;
        trend_down: boolean;
        title: string;
        trend_equal: boolean;
        trend_up: boolean;
        is_released: boolean;
        rank_value_changed: number;
        interest: null;
        color_scheme: {
            is_dark: boolean;
            primary_color_light: string;
            _base_color: number[];
            secondary_color: string;
            _avg_color: number[];
            primary_color_dark: string;
        };
        type: string;
        has_online_read: boolean;
        onsale: boolean;
        description: string;
        tags: Array<{
            type: string;
            name: string;
        }>;
        cover_url: string;
        min_sale_price: string;
        other_version: null;
        sharing_url: string;
        url: string;
        honor_infos: Array<{
            kind: string;
            uri: string;
            rank: number;
            title: string;
        }>;
        subtype: string;
        buy_more_uri: string;
        has_ebook: boolean;
        cards: Array<{
            content: string;
            kind: string;
            kind_cn: string;
            author_name: string;
            photo_url: string;
        }>;
        null_rating_reason: string;
    }>;
    total: number;
    start: number;
}

async function fetchBooks() {
    const apiUrl = 'https://m.douban.com/rexxar/api/v2/subject_collection/book_hot_monthly/items';
    const response = await ofetch<Response>(apiUrl, {
        query: {
            start: 0,
            count: 50,
            updated_at: '',
            items_only: 1,
            type_tag: '',
            for_mobile: 1,
        },
        headers: {
            accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6',
            'cache-control': 'no-cache',
            dnt: '1',
            pragma: 'no-cache',
            priority: 'u=1, i',
            referer: 'https://m.douban.com/subject_collection/book_hot_monthly?dt_dapp=1',
            'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        },
    });

    if (!response || !response.subject_collection_items) {
        throw new Error('Invalid response from Douban API');
    }

    return response;
}
