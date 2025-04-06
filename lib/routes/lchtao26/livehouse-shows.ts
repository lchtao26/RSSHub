import { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import ofetch from '@/utils/ofetch';
import timezone from '@/utils/timezone';
import { Show } from './show/interface';
import { render } from './show/render';

export const route: Route = {
    path: '/livehouse-shows/:city/:keyword?',
    categories: ['shopping'],
    example: '/lchtao26/livehouse-shows/上海',
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
            title: ['LiveHouse', city, keyword].filter(Boolean).join(' - '),
            link: 'https://www.livestart.com.cn',
            item: shows.map((show) => ({
                title: show.title,
                link: getSafeUrl(show.url),
                pubDate: getDate(show.createTime),
                updated: getDate(show.updateTime),
                description: render(show),
                allowEmpty: true,
            })),
        };
    },
};

interface Response {
    data: Array<{
        month: number;
        month_show: Array<{
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
                price: string | number;
            }>;
            prices_str: string;
            is_favor: boolean;
            site_visible: boolean;
            create_time: number;
            update_time: number;
        }>;
    }>;
}

async function fetchShows(city: string, keyword?: string): Promise<Show[]> {
    const resp = await ofetch<Response>('https://www.livestart.com.cn/api/v1/month_liveshow', {
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
        .filter((item) => Boolean(item.url))
        .map(
            (item) =>
                ({
                    id: item.id,
                    title: item.title,
                    url: item.url,
                    poster: item.poster,
                    showTime: item.show_time,
                    city: item.city,
                    site: item.site,
                    performers: item.performers,
                    prices: item.prices ? item.prices.map((p: any) => p.price).join(' - ') : '',
                    createTime: item.create_time,
                    updateTime: item.update_time,
                }) satisfies Show
        );
    return shows;
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

function getDate(t: number) {
    return timezone(parseDate(t, 'X'), +8);
}
