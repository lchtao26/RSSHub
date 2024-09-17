import { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import ofetch from '@/utils/ofetch';
import timezone from '@/utils/timezone';
import dayjs from 'dayjs';

export const route: Route = {
    path: '/:city/:keyword?',
    categories: ['shopping'],
    example: '/livestart/上海',
    parameters: {
        city: '城市',
        keyword: '关键词',
    },
    name: '演出更新',
    maintainers: ['lchtao26'],
    handler: async (ctx) => {
        const city = decodeURIComponent(ctx.req.param('city') ?? '');
        const keyword = decodeURIComponent(ctx.req.param('keyword') ?? '');
        const shows = await fetchShows(city, keyword);
        return {
            title: ['LiveStart', city, keyword].filter(Boolean).join(' - '),
            link: 'https://www.livestart.com.cn',
            item: shows.map((show) => ({
                title: show.title,
                link: getSafeUrl(show.url),
                pubDate: getDate(show.create_time),
                updated: getDate(show.update_time),
                description: getDescription(show),
                allowEmpty: true,
            })),
        };
    },
};

async function fetchShows(city: string, keyword?: string) {
    const resp = await ofetch('https://www.livestart.com.cn/api/v1/month_liveshow', {
        method: 'GET',
        query: {
            city,
            keyword,
        },
        headers: {
            'Content-Type': 'application/json',
            'Access-Token': 'livestart',
        },
    });
    const shows = (resp.data || [])
        .flatMap((item) => item.month_show)
        .filter((item) => Boolean(item.title))
        .filter((item) => Boolean(item.url));
    return shows as Show[];
}
interface Show {
    id: number;
    status: string;
    is_hide: boolean;
    city: string;
    site: string;
    title: string;
    performers: string;
    show_time: number;
    url: string;
    source: string;
    ticket_time: number;
    is_ticket_notify: boolean;
    related_rooms: string;
    poster: string;
    poster_thumbnail: string;
    prices: Array<{
        type: string;
        price: string;
    }>;
    is_favor: boolean;
    site_visible: boolean;
    create_time: number;
    update_time: number;
}

function getSafeUrl(url: string = '') {
    if (url.startsWith('http')) {
        return url;
    }
    url = `https://${url}`;
    if (URL.canParse(url)) {
        return url;
    }
}

function getDescription(show: Show) {
    const prices = (show.prices || []).map((p) => Number.parseInt(p.price));
    const descriptionParts = [
        show.poster ? `<img src="https://www.livestart.com.cn/api/v1/poster/${show.poster}" />` : '',
        show.show_time ? `<p>演出时间：${formatDate(show.show_time)}</p>` : '',
        show.city || show.site ? `<p>地址：${[show.city, show.site].filter(Boolean).join(' - ')}</p>` : '',
        show.performers ? `<p>艺人：${show.performers}</p>` : '',
        prices.length > 0 ? `<p>价格：${Math.min(...prices)} 元起</p>` : '',
    ];

    return descriptionParts.filter(Boolean).join('');
}

function getDate(t: number) {
    return timezone(parseDate(t, 'X'), +8);
}

function formatDate(t: number) {
    const date = getDate(t);
    return dayjs(date).format('YYYY-MM-DD');
}
